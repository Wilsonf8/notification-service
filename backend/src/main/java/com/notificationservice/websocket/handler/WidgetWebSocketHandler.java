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

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * WebSocket handler for widget visitor connections.
 * Manages visitor presence and broadcasts events to reps.
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
            log.error("Widget connection missing required attributes");
            try {
                session.close(CloseStatus.POLICY_VIOLATION);
            } catch (Exception e) {
                log.warn("Error closing session", e);
            }
            return;
        }

        // Register session
        sessionManager.addSession(visitorId, projectId, session);

        // Update visitor in database and broadcast to reps
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            boolean isFirstConnection = visitor.getActiveConnections() == 0;

            visitor.setActiveConnections(visitor.getActiveConnections() + 1);
            visitor.setDisconnectedAt(null); // Clear any pending disconnect
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

            log.info("Visitor connected: visitorId={}, projectId={}, activeConnections={}",
                    visitorId, projectId, visitor.getActiveConnections());
        });
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");

        try {
            JsonNode json = objectMapper.readTree(message.getPayload());
            String type = json.has("type") ? json.get("type").asText() : null;

            switch (type) {
                case "heartbeat" -> handleHeartbeat(visitorId);
                case "page_change" -> handlePageChange(projectId, visitorId, json);
                default -> log.debug("Unknown message type from visitor: {}", type);
            }
        } catch (Exception e) {
            log.warn("Failed to parse message from visitor {}: {}", visitorId, e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        UUID projectId = (UUID) session.getAttributes().get("projectId");
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");

        if (projectId == null || visitorId == null) {
            return;
        }

        // Remove session
        sessionManager.removeSession(visitorId, session);

        // Update visitor in database
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            int newConnections = Math.max(0, visitor.getActiveConnections() - 1);
            visitor.setActiveConnections(newConnections);

            // Set disconnectedAt if this was the last connection (starts grace period)
            if (newConnections == 0) {
                visitor.setDisconnectedAt(OffsetDateTime.now());
            }

            visitorRepository.save(visitor);
            log.info("Visitor disconnected: visitorId={}, projectId={}, activeConnections={}",
                    visitorId, projectId, newConnections);
        });
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");
        log.error("Transport error for visitor {}: {}", visitorId, exception.getMessage());
    }

    private void handleHeartbeat(UUID visitorId) {
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            visitor.setLastSeenAt(OffsetDateTime.now());
            visitorRepository.save(visitor);
            log.trace("Heartbeat received from visitor: visitorId={}", visitorId);
        });
    }

    private void handlePageChange(UUID projectId, UUID visitorId, JsonNode json) {
        String url = json.has("url") ? json.get("url").asText() : null;
        String title = json.has("title") ? json.get("title").asText() : null;

        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            // Update metadata
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

            // Broadcast to reps
            VisitorUpdatedEvent event = new VisitorUpdatedEvent(visitorId, url);
            broadcaster.broadcastToProject(projectId, event);

            log.debug("Visitor page change: visitorId={}, url={}", visitorId, url);
        });
    }

    private String extractCurrentPage(LiveConnectVisitor visitor) {
        if (visitor.getMetadata() != null) {
            Object page = visitor.getMetadata().get("currentPage");
            if (page != null) {
                return page.toString();
            }
        }
        return null;
    }
}