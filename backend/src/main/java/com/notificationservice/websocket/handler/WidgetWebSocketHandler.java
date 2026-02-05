package com.notificationservice.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.VisitorJoinedEvent;
import com.notificationservice.websocket.event.VisitorUpdatedEvent;
import com.notificationservice.websocket.session.VisitorSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * WebSocket handler for widget visitor connections.
 * Manages visitor presence, heartbeat tracking, and page change events.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WidgetWebSocketHandler extends TextWebSocketHandler {

    private final VisitorSessionManager sessionManager;
    private final LiveConnectVisitorRepository visitorRepository;
    private final WebSocketBroadcaster broadcaster;
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");

        if (projectId == null || visitorId == null) {
            log.error("[WidgetWS] Connection missing required attributes");
            try {
                session.close(CloseStatus.POLICY_VIOLATION);
            } catch (Exception e) {
                log.warn("[WidgetWS] Error closing session", e);
            }
            return;
        }

        // Register session with VisitorSessionManager
        sessionManager.addSession(visitorId, projectId, session);

        // Update visitor in database and broadcast to reps
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            // Check actual session count - if this is the only session, it's a "first" connection
            // This is more reliable than DB count which can get stale after server restarts
            boolean isFirstConnection = sessionManager.getSessionCount(visitorId) == 1;

            // Sync DB with actual session count to fix any stale values
            visitor.setActiveConnections(sessionManager.getSessionCount(visitorId));
            visitor.setDisconnectedAt(null);
            visitor.setLastSeenAt(OffsetDateTime.now());
            visitorRepository.save(visitor);

            // Broadcast visitor_joined only on first connection
            if (isFirstConnection) {
                String currentPage = extractCurrentPage(visitor);
                VisitorJoinedEvent event = new VisitorJoinedEvent(
                        visitor.getId(),
                        visitor.getName(),
                        visitor.getEmail(),
                        currentPage,
                        OffsetDateTime.now()
                );
                broadcaster.broadcastToProject(projectId, event);
            }

            log.info("[WidgetWS] Visitor connected: visitorId={}, projectId={}, activeConnections={}",
                    visitorId, projectId, visitor.getActiveConnections());
        });

        // Send connected confirmation
        sendMessage(session, "{\"type\":\"connected\",\"sessionId\":\"" + session.getId() + "\"}");
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");

        if (visitorId == null) {
            log.warn("[WidgetWS] Message from session without visitorId: {}", session.getId());
            return;
        }

        try {
            JsonNode json = objectMapper.readTree(message.getPayload());
            String type = json.has("type") ? json.get("type").asText() : null;

            switch (type) {
                case "heartbeat" -> handleHeartbeat(visitorId);
                case "page_change" -> handlePageChange(projectId, visitorId, json);
                case "ping" -> sendMessage(session, "{\"type\":\"pong\"}");
                default -> log.debug("[WidgetWS] Unknown message type: {}", type);
            }
        } catch (Exception e) {
            log.warn("[WidgetWS] Failed to parse message: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");

        if (visitorId == null) {
            log.debug("[WidgetWS] Close for session without visitorId: {}", session.getId());
            return;
        }

        // Remove session from VisitorSessionManager
        sessionManager.removeSession(visitorId, session);

        // Update visitor in database
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            int newConnections = Math.max(0, visitor.getActiveConnections() - 1);
            visitor.setActiveConnections(newConnections);

            if (newConnections == 0) {
                visitor.setDisconnectedAt(OffsetDateTime.now());
            }

            visitorRepository.save(visitor);
            log.info("[WidgetWS] Visitor disconnected: visitorId={}, projectId={}, activeConnections={}, reason={}",
                    visitorId, projectId, newConnections, status);
        });
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");
        log.error("[WidgetWS] Transport error for visitor {}: {}", visitorId, exception.getMessage());
    }

    /**
     * Handles heartbeat messages by updating visitor's lastSeenAt timestamp.
     *
     * @param visitorId the visitor's internal ID
     */
    private void handleHeartbeat(UUID visitorId) {
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            visitor.setLastSeenAt(OffsetDateTime.now());
            visitorRepository.save(visitor);
        });
    }

    /**
     * Handles page change messages by updating visitor metadata and broadcasting to reps.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param json the JSON message containing url and title
     */
    private void handlePageChange(UUID projectId, UUID visitorId, JsonNode json) {
        String url = json.has("url") ? json.get("url").asText() : null;
        String title = json.has("title") ? json.get("title").asText() : null;

        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            Map<String, Object> metadata = visitor.getMetadata();
            if (metadata == null) {
                metadata = new HashMap<>();
            }
            if (url != null) {
                metadata.put("currentPage", url);
            }
            if (title != null) {
                metadata.put("currentPageTitle", title);
            }
            visitor.setMetadata(metadata);
            visitor.setLastSeenAt(OffsetDateTime.now());
            visitorRepository.save(visitor);

            VisitorUpdatedEvent event = new VisitorUpdatedEvent(visitorId, url);
            broadcaster.broadcastToProject(projectId, event);

            log.debug("[WidgetWS] Visitor page change: visitorId={}, url={}", visitorId, url);
        });
    }

    /**
     * Extracts the current page URL from visitor metadata.
     *
     * @param visitor the visitor entity
     * @return the current page URL, or null if not set
     */
    private String extractCurrentPage(LiveConnectVisitor visitor) {
        if (visitor.getMetadata() != null) {
            Object page = visitor.getMetadata().get("currentPage");
            if (page != null) {
                return page.toString();
            }
        }
        return null;
    }

    /**
     * Sends a text message to the WebSocket session.
     *
     * @param session the WebSocket session
     * @param message the message to send
     */
    private void sendMessage(WebSocketSession session, String message) {
        try {
            session.sendMessage(new TextMessage(message));
        } catch (IOException e) {
            log.warn("[WidgetWS] Error sending message: {}", e.getMessage());
        }
    }
}
