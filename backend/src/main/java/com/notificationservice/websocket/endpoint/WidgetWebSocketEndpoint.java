package com.notificationservice.websocket.endpoint;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.entity.LiveConnectSession;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.service.LiveConnectSessionService;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.VisitorJoinedEvent;
import com.notificationservice.websocket.event.VisitorUpdatedEvent;
import com.notificationservice.websocket.session.VisitorSessionManager;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JSR 356 WebSocket endpoint for widget visitor connections.
 * Uses native Tomcat WebSocket which works better with Railway.
 */
@Slf4j
@Component
@ServerEndpoint(value = "/v1/liveconnect/ws", configurator = SpringWebSocketConfigurator.class)
public class WidgetWebSocketEndpoint {

    private static LiveConnectSessionService sessionService;
    private static LiveConnectVisitorRepository visitorRepository;
    private static VisitorSessionManager visitorSessionManager;
    private static WebSocketBroadcaster broadcaster;
    private static ObjectMapper objectMapper;

    // Store session attributes since JSR 356 doesn't have Spring's attribute system
    private static final Map<String, SessionData> sessionDataMap = new ConcurrentHashMap<>();

    @Autowired
    public void setSessionService(LiveConnectSessionService service) {
        WidgetWebSocketEndpoint.sessionService = service;
    }

    @Autowired
    public void setVisitorRepository(LiveConnectVisitorRepository repo) {
        WidgetWebSocketEndpoint.visitorRepository = repo;
    }

    @Autowired
    public void setVisitorSessionManager(VisitorSessionManager manager) {
        WidgetWebSocketEndpoint.visitorSessionManager = manager;
    }

    @Autowired
    public void setBroadcaster(WebSocketBroadcaster bc) {
        WidgetWebSocketEndpoint.broadcaster = bc;
    }

    @Autowired
    public void setObjectMapper(ObjectMapper om) {
        WidgetWebSocketEndpoint.objectMapper = om;
    }

    @OnOpen
    public void onOpen(Session session) {
        log.info("[WidgetWS] Connection attempt: {}", session.getId());

        try {
            // Extract token from query string
            String queryString = session.getQueryString();
            String token = extractToken(queryString);

            if (token == null || token.isBlank()) {
                log.warn("[WidgetWS] No token provided");
                sendError(session, "No session token provided");
                session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "No token"));
                return;
            }

            // Validate session token
            LiveConnectSession liveConnectSession;
            try {
                liveConnectSession = sessionService.validateSession(token);
            } catch (Exception e) {
                log.warn("[WidgetWS] Invalid session token: {}", e.getMessage());
                sendError(session, "Invalid or expired session token");
                session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Invalid token"));
                return;
            }

            UUID projectId = liveConnectSession.getProject().getId();
            UUID visitorId = liveConnectSession.getVisitor().getId();

            // Store session data
            SessionData data = new SessionData(projectId, visitorId, token);
            sessionDataMap.put(session.getId(), data);

            // Update visitor in database and broadcast to reps
            visitorRepository.findById(visitorId).ifPresent(visitor -> {
                boolean isFirstConnection = visitor.getActiveConnections() == 0;

                visitor.setActiveConnections(visitor.getActiveConnections() + 1);
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

        } catch (Exception e) {
            log.error("[WidgetWS] Error during connection", e);
            try {
                session.close(new CloseReason(CloseReason.CloseCodes.UNEXPECTED_CONDITION, "Server error"));
            } catch (IOException ex) {
                log.warn("[WidgetWS] Error closing session", ex);
            }
        }
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        SessionData data = sessionDataMap.get(session.getId());
        if (data == null) {
            log.warn("[WidgetWS] Message from unknown session: {}", session.getId());
            return;
        }

        try {
            JsonNode json = objectMapper.readTree(message);
            String type = json.has("type") ? json.get("type").asText() : null;

            switch (type) {
                case "heartbeat" -> handleHeartbeat(data.visitorId);
                case "page_change" -> handlePageChange(data.projectId, data.visitorId, json);
                case "ping" -> sendMessage(session, "{\"type\":\"pong\"}");
                default -> log.debug("[WidgetWS] Unknown message type: {}", type);
            }
        } catch (Exception e) {
            log.warn("[WidgetWS] Failed to parse message: {}", e.getMessage());
        }
    }

    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        SessionData data = sessionDataMap.remove(session.getId());
        if (data == null) {
            log.debug("[WidgetWS] Close for unknown session: {}", session.getId());
            return;
        }

        // Update visitor in database
        visitorRepository.findById(data.visitorId).ifPresent(visitor -> {
            int newConnections = Math.max(0, visitor.getActiveConnections() - 1);
            visitor.setActiveConnections(newConnections);

            if (newConnections == 0) {
                visitor.setDisconnectedAt(OffsetDateTime.now());
            }

            visitorRepository.save(visitor);
            log.info("[WidgetWS] Visitor disconnected: visitorId={}, projectId={}, activeConnections={}, reason={}",
                    data.visitorId, data.projectId, newConnections, closeReason);
        });
    }

    @OnError
    public void onError(Session session, Throwable error) {
        SessionData data = sessionDataMap.get(session.getId());
        UUID visitorId = data != null ? data.visitorId : null;
        log.error("[WidgetWS] Error for visitor {}: {}", visitorId, error.getMessage());
    }

    private String extractToken(String queryString) {
        if (queryString == null) return null;
        for (String param : queryString.split("&")) {
            String[] keyValue = param.split("=", 2);
            if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                return keyValue[1];
            }
        }
        return null;
    }

    private void handleHeartbeat(UUID visitorId) {
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            visitor.setLastSeenAt(OffsetDateTime.now());
            visitorRepository.save(visitor);
        });
    }

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

    private String extractCurrentPage(LiveConnectVisitor visitor) {
        if (visitor.getMetadata() != null) {
            Object page = visitor.getMetadata().get("currentPage");
            if (page != null) {
                return page.toString();
            }
        }
        return null;
    }

    private void sendMessage(Session session, String message) {
        try {
            session.getBasicRemote().sendText(message);
        } catch (IOException e) {
            log.warn("[WidgetWS] Error sending message: {}", e.getMessage());
        }
    }

    private void sendError(Session session, String error) {
        sendMessage(session, "{\"type\":\"error\",\"message\":\"" + error + "\"}");
    }

    /**
     * Session data holder since JSR 356 doesn't have Spring's attribute system.
     */
    private record SessionData(UUID projectId, UUID visitorId, String token) {}
}
