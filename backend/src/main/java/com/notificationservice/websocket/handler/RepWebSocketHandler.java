package com.notificationservice.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.service.LiveConnectRepService;
import com.notificationservice.service.LiveConnectRequestService;
import com.notificationservice.websocket.ratelimit.WebSocketRateLimiter;
import com.notificationservice.websocket.scheduler.RepHeartbeatBatchProcessor;
import com.notificationservice.websocket.session.RepSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * WebSocket handler for rep dashboard connections.
 * Manages rep presence and heartbeat tracking.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RepWebSocketHandler extends TextWebSocketHandler {

    private final RepSessionManager sessionManager;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectRepService repService;
    private final LiveConnectRequestService requestService;
    private final RepHeartbeatBatchProcessor repHeartbeatBatchProcessor;
    private final WebSocketRateLimiter webSocketRateLimiter;
    private final ObjectMapper objectMapper;

    /** Send timeout in milliseconds for ConcurrentWebSocketSessionDecorator. */
    private static final int SEND_TIME_LIMIT_MS = 5000;
    /** Buffer size limit in bytes for ConcurrentWebSocketSessionDecorator. */
    private static final int BUFFER_SIZE_LIMIT = 64 * 1024;

    @Override
    public void afterConnectionEstablished(WebSocketSession rawSession) {
        // Wrap with ConcurrentWebSocketSessionDecorator for non-blocking sends.
        WebSocketSession session = new ConcurrentWebSocketSessionDecorator(
                rawSession, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT);

        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID userId = (UUID) session.getAttributes().get("userId");

        if (projectId == null || userId == null) {
            log.error("Rep connection missing required attributes");
            try {
                session.close(CloseStatus.POLICY_VIOLATION);
            } catch (Exception e) {
                log.warn("Error closing session", e);
            }
            return;
        }

        // Store decorated session in raw session attributes so afterConnectionClosed
        // can retrieve the same object for removal (ConcurrentWebSocketSessionDecorator
        // does not override equals/hashCode, so identity match is required).
        rawSession.getAttributes().put("decoratedSession", session);

        // Register session
        sessionManager.addSession(projectId, userId, session);

        // Update rep presence in database (use session manager count for atomicity)
        repRepository.findByProjectIdAndUserId(projectId, userId).ifPresent(rep -> {
            rep.setPresence(RepPresence.ONLINE);
            rep.setActiveConnections(sessionManager.getProjectSessionCount(projectId, userId));
            rep.setLastHeartbeat(OffsetDateTime.now());
            repRepository.save(rep);
            repService.broadcastRepStatusChanged(rep.getId());
            log.info("Rep connected: userId={}, projectId={}, activeConnections={}",
                    userId, projectId, rep.getActiveConnections());
        });
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID userId = (UUID) session.getAttributes().get("userId");

        // Per-connection rate limiting
        if (!webSocketRateLimiter.allowMessage(session.getId())) {
            log.warn("Rate limited rep session: {}, userId={}", session.getId(), userId);
            return;
        }

        try {
            JsonNode json = objectMapper.readTree(message.getPayload());
            String type = json.has("type") ? json.get("type").asText() : null;

            if ("heartbeat".equals(type)) {
                handleHeartbeat(projectId, userId);
            } else {
                log.debug("Unknown message type from rep: {}", type);
            }
        } catch (Exception e) {
            log.warn("Failed to parse message from rep {}: {}", userId, e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID userId = (UUID) session.getAttributes().get("userId");

        if (projectId == null || userId == null) {
            return;
        }

        // Cleanup rate limiter state for closed session
        webSocketRateLimiter.removeSession(session.getId());

        // Retrieve the decorated session stored during connect — the session manager
        // holds the decorated instance, so we must remove that exact object.
        WebSocketSession decoratedSession = (WebSocketSession) session.getAttributes().get("decoratedSession");
        WebSocketSession toRemove = decoratedSession != null ? decoratedSession : session;

        // Remove session
        sessionManager.removeSession(projectId, userId, toRemove);

        // Withdraw pings originated from this specific device session
        String deviceSessionId = (String) session.getAttributes().get("deviceSessionId");
        if (deviceSessionId != null) {
            requestService.withdrawPendingPingsByDeviceSession(deviceSessionId, projectId);
        }

        // Update rep presence in database (use session manager count for atomicity)
        repRepository.findByProjectIdAndUserId(projectId, userId).ifPresent(rep -> {
            int newConnections = sessionManager.getProjectSessionCount(projectId, userId);
            rep.setActiveConnections(newConnections);

            // Set to OFFLINE only if this was the last connection and not in a call
            boolean wentOffline = false;
            if (newConnections == 0 && rep.getPresence() != RepPresence.IN_CALL) {
                rep.setPresence(RepPresence.OFFLINE);
                wentOffline = true;
                // Withdraw any remaining pending pings (safety net)
                requestService.withdrawPendingPingsOnDisconnect(rep.getId(), projectId);
            }

            repRepository.save(rep);
            if (wentOffline) {
                repService.broadcastRepStatusChanged(rep.getId());
            }
            log.info("Rep disconnected: userId={}, projectId={}, activeConnections={}, presence={}",
                    userId, projectId, newConnections, rep.getPresence());
        });
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        UUID userId = (UUID) session.getAttributes().get("userId");
        log.error("Transport error for rep {}: {}", userId, exception.getMessage());
    }

    private void handleHeartbeat(UUID projectId, UUID userId) {
        repRepository.findByProjectIdAndUserId(projectId, userId).ifPresent(rep -> {
            repHeartbeatBatchProcessor.recordHeartbeat(rep.getId());
            log.trace("Heartbeat received from rep: userId={}", userId);
        });
    }
}