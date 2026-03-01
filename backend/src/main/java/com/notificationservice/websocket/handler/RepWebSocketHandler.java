package com.notificationservice.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.service.LiveConnectRepService;
import com.notificationservice.service.LiveConnectRequestService;
import com.notificationservice.websocket.session.RepSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
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
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
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

        // Register session
        sessionManager.addSession(projectId, userId, session);

        // Update rep presence in database
        repRepository.findByProjectIdAndUserId(projectId, userId).ifPresent(rep -> {
            rep.setPresence(RepPresence.ONLINE);
            rep.setActiveConnections(rep.getActiveConnections() + 1);
            rep.setLastHeartbeat(OffsetDateTime.now());
            repRepository.save(rep);
            repService.broadcastRepStatusChanged(rep);
            log.info("Rep connected: userId={}, projectId={}, activeConnections={}",
                    userId, projectId, rep.getActiveConnections());
        });
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID userId = (UUID) session.getAttributes().get("userId");

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

        // Remove session
        sessionManager.removeSession(projectId, userId, session);

        // Update rep presence in database
        repRepository.findByProjectIdAndUserId(projectId, userId).ifPresent(rep -> {
            int newConnections = Math.max(0, rep.getActiveConnections() - 1);
            rep.setActiveConnections(newConnections);

            // Set to OFFLINE only if this was the last connection and not in a call
            boolean wentOffline = false;
            if (newConnections == 0 && rep.getPresence() != RepPresence.IN_CALL) {
                rep.setPresence(RepPresence.OFFLINE);
                wentOffline = true;
                // Withdraw any pending pings this rep sent to visitors
                requestService.withdrawPendingPingsOnDisconnect(rep.getId(), projectId);
            }

            repRepository.save(rep);
            if (wentOffline) {
                repService.broadcastRepStatusChanged(rep);
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
            rep.setLastHeartbeat(OffsetDateTime.now());
            repRepository.save(rep);
            log.trace("Heartbeat received from rep: userId={}", userId);
        });
    }
}