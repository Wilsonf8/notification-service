package com.notificationservice.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.LiveConnectPageView;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectPageViewRepository;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.LiveConnectVisitorVisitRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.service.LiveConnectCrmService;
import com.notificationservice.service.LiveConnectVisitService;
import com.notificationservice.service.PushNotificationService;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.VisitorJoinedEvent;
import com.notificationservice.websocket.event.VisitorUpdatedEvent;
import com.notificationservice.websocket.ratelimit.WebSocketRateLimiter;
import com.notificationservice.websocket.scheduler.HeartbeatBatchProcessor;
import com.notificationservice.websocket.session.VisitorConnectionGracePeriodManager;
import com.notificationservice.websocket.session.VisitorSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

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
    private final LiveConnectRequestRepository requestRepository;
    private final LiveConnectConversationRepository conversationRepository;
    private final WebSocketBroadcaster broadcaster;
    private final ObjectMapper objectMapper;
    private final VisitorConnectionGracePeriodManager gracePeriodManager;
    private final PushNotificationService pushNotificationService;
    private final LiveConnectCrmService crmService;
    private final LiveConnectVisitService visitService;
    private final LiveConnectVisitorVisitRepository visitRepository;
    private final ProjectRepository projectRepository;
    private final HeartbeatBatchProcessor heartbeatBatchProcessor;
    private final LiveConnectPageViewRepository pageViewRepository;
    private final WebSocketRateLimiter webSocketRateLimiter;

    /** Tracks current page start time per visitor for duration calculation. */
    private final ConcurrentHashMap<UUID, PageTrackingState> pageTrackingState = new ConcurrentHashMap<>();

    /**
     * Holds the current page URL, title, and timestamp for duration tracking.
     */
    private record PageTrackingState(String url, String title, UUID projectId, OffsetDateTime startedAt) {}

    /** Send timeout in milliseconds for ConcurrentWebSocketSessionDecorator. */
    private static final int SEND_TIME_LIMIT_MS = 5000;
    /** Buffer size limit in bytes for ConcurrentWebSocketSessionDecorator. */
    private static final int BUFFER_SIZE_LIMIT = 64 * 1024;

    @Override
    public void afterConnectionEstablished(WebSocketSession rawSession) {
        // Wrap with ConcurrentWebSocketSessionDecorator for non-blocking sends.
        // This prevents one slow client from blocking broadcasts to others.
        WebSocketSession session = new ConcurrentWebSocketSessionDecorator(
                rawSession, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT);

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

        // Cancel any pending disconnection broadcast (visitor reconnected within grace period)
        gracePeriodManager.cancelPendingDisconnection(visitorId);

        // Store decorated session in raw session attributes so afterConnectionClosed
        // can retrieve the same object for removal (ConcurrentWebSocketSessionDecorator
        // does not override equals/hashCode, so identity match is required).
        rawSession.getAttributes().put("decoratedSession", session);

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

            // Record visit on first connection
            if (isFirstConnection) {
                visitService.recordConnection(visitor);
                crmService.calculateLeadScore(visitor.getId());
            }

            // Broadcast visitor_joined only on first connection
            // Skip if visitor has a pending request (waiting) or active conversation (in call)
            // Uses in-memory state cache instead of DB queries for O(1) check
            if (isFirstConnection) {
                boolean isBrowsing = sessionManager.isBrowsing(visitorId);

                if (isBrowsing) {
                    String currentPage = extractCurrentPage(visitor);

                    // Combined query: visit count + latest completed endedAt (2 queries → 1)
                    Object[] visitData = visitRepository.countAndLatestEndedAtByVisitorId(visitorId);
                    // JPA may nest the row inside an outer Object[] — unwrap if needed
                    if (visitData.length > 0 && visitData[0] instanceof Object[]) {
                        visitData = (Object[]) visitData[0];
                    }
                    long totalVisitCount = visitData[0] != null ? ((Number) visitData[0]).longValue() : 0;
                    OffsetDateTime previousVisitEndedAt = (OffsetDateTime) visitData[1];
                    boolean hasHadConversation = conversationRepository.existsAnyByVisitorId(visitorId);
                    boolean isFirstVisit = totalVisitCount <= 1 && !hasHadConversation;

                    VisitorJoinedEvent event = new VisitorJoinedEvent(
                            visitor.getId(),
                            visitor.getName(),
                            visitor.getEmail(),
                            currentPage,
                            OffsetDateTime.now(),
                            isFirstVisit,
                            previousVisitEndedAt,
                            (int) totalVisitCount,
                            visitor.getCountryCode(),
                            visitor.getCountry(),
                            visitor.getCity(),
                            visitor.getBrowserName(),
                            visitor.getOsName(),
                            visitor.getDeviceType()
                    );
                    broadcaster.broadcastToProject(projectId, event);

                    // Resolve project name for notification title
                    String projectName = projectRepository.findByIdAndNotDeleted(projectId)
                            .map(Project::getName).orElse(null);

                    // Fetch interaction data for returning visitors only
                    // Combined queries: 4 individual queries → 2 combined queries
                    long callsThisWeek = 0;
                    long requestsThisWeek = 0;
                    long declinedPingsThisWeek = 0;
                    boolean hasAnyInteractions = false;
                    if (!isFirstVisit) {
                        OffsetDateTime weekAgo = OffsetDateTime.now().minusDays(7);

                        Object[] convStats = conversationRepository.getVisitorConversationStats(visitorId, weekAgo);
                        if (convStats.length > 0 && convStats[0] instanceof Object[]) {
                            convStats = (Object[]) convStats[0];
                        }
                        callsThisWeek = convStats[0] != null ? ((Number) convStats[0]).longValue() : 0;
                        boolean hasAnyConversations = convStats[1] != null && (Boolean) convStats[1];

                        Object[] reqStats = requestRepository.getVisitorRequestStats(visitorId, weekAgo);
                        if (reqStats.length > 0 && reqStats[0] instanceof Object[]) {
                            reqStats = (Object[]) reqStats[0];
                        }
                        requestsThisWeek = reqStats[0] != null ? ((Number) reqStats[0]).longValue() : 0;
                        declinedPingsThisWeek = reqStats[1] != null ? ((Number) reqStats[1]).longValue() : 0;
                        boolean hasAnyRequests = reqStats[2] != null && (Boolean) reqStats[2];

                        hasAnyInteractions = hasAnyConversations || hasAnyRequests;
                    }

                    // Send push notification to reps who are offline
                    pushNotificationService.sendVisitorPresenceNotification(
                            projectId, visitor, projectName, isFirstVisit,
                            totalVisitCount, callsThisWeek, requestsThisWeek,
                            declinedPingsThisWeek, hasAnyInteractions);
                } else {
                    log.debug("[WidgetWS] Skipping visitor_joined broadcast for visitor in waiting/call state: visitorId={}", visitorId);
                }
            }

            // Initialize page tracking for this visitor
            String currentPage = extractCurrentPage(visitor);
            if (currentPage != null) {
                pageTrackingState.put(visitorId, new PageTrackingState(
                        currentPage, extractCurrentPageTitle(visitor), projectId, OffsetDateTime.now()));
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

        // Per-connection rate limiting
        if (!webSocketRateLimiter.allowMessage(session.getId())) {
            log.warn("[WidgetWS] Rate limited session: {}, visitorId={}", session.getId(), visitorId);
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

        // Cleanup rate limiter state for closed session
        webSocketRateLimiter.removeSession(session.getId());

        // Retrieve the decorated session stored during connect — the session manager
        // holds the decorated instance, so we must remove that exact object.
        WebSocketSession decoratedSession = (WebSocketSession) session.getAttributes().get("decoratedSession");
        WebSocketSession toRemove = decoratedSession != null ? decoratedSession : session;

        // Remove session from VisitorSessionManager
        sessionManager.removeSession(visitorId, toRemove);

        // Check actual session count after removal
        int actualSessionCount = sessionManager.getSessionCount(visitorId);
        boolean isLastConnection = actualSessionCount == 0;

        // Record final page view on disconnect
        if (isLastConnection) {
            recordPreviousPageView(visitorId);
            pageTrackingState.remove(visitorId);
        }

        // Update visitor in database
        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            // Sync DB with actual session count
            visitor.setActiveConnections(actualSessionCount);

            if (isLastConnection) {
                visitService.recordDisconnection(visitorId);
                visitor.setDisconnectedAt(OffsetDateTime.now());

                // Schedule disconnection broadcast with 3-second grace period
                // (smooths page refreshes/navigation where visitor briefly disconnects)
                VisitorUpdatedEvent event = new VisitorUpdatedEvent(
                        visitor.getId(),
                        visitor.getName(),
                        visitor.getEmail(),
                        extractCurrentPage(visitor),
                        extractCurrentPageTitle(visitor),
                        false,  // isConnected = false
                        visitor.getCountryCode(),
                        visitor.getCountry(),
                        visitor.getCity(),
                        visitor.getBrowserName(),
                        visitor.getOsName(),
                        visitor.getDeviceType()
                );
                gracePeriodManager.scheduleDisconnectionBroadcast(visitorId, projectId, event);
            }

            visitorRepository.save(visitor);
            log.info("[WidgetWS] Visitor disconnected: visitorId={}, projectId={}, activeConnections={}, reason={}",
                    visitorId, projectId, actualSessionCount, status);
        });
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        UUID visitorId = (UUID) session.getAttributes().get("visitorId");
        log.error("[WidgetWS] Transport error for visitor {}: {}", visitorId, exception.getMessage());
    }

    /**
     * Handles heartbeat messages by queueing a lastSeenAt update.
     * Actual DB write is batched by HeartbeatBatchProcessor (every 10s).
     *
     * @param visitorId the visitor's internal ID
     */
    private void handleHeartbeat(UUID visitorId) {
        heartbeatBatchProcessor.recordHeartbeat(visitorId);
    }

    /**
     * Handles page change messages by updating visitor metadata, recording page views,
     * and broadcasting to reps.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param json the JSON message containing url and title
     */
    private void handlePageChange(UUID projectId, UUID visitorId, JsonNode json) {
        String url = json.has("url") ? json.get("url").asText() : null;
        String title = json.has("title") ? json.get("title").asText() : null;

        // Record page view for the previous page (with duration)
        recordPreviousPageView(visitorId);

        // Track current page start time
        if (url != null) {
            pageTrackingState.put(visitorId, new PageTrackingState(url, title, projectId, OffsetDateTime.now()));
        }

        visitorRepository.findById(visitorId).ifPresent(visitor -> {
            // Update metadata regardless of state (keeps DB in sync)
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

            // Only broadcast page changes for "browsing" visitors
            // Uses in-memory state cache instead of DB queries for O(1) check
            if (!sessionManager.isBrowsing(visitorId)) {
                log.debug("[WidgetWS] Skipping page change broadcast for visitor in waiting/call state: visitorId={}", visitorId);
                return;
            }

            VisitorUpdatedEvent event = new VisitorUpdatedEvent(
                    visitorId,
                    visitor.getName(),
                    visitor.getEmail(),
                    url,
                    title,
                    true,  // isConnected - they're sending page changes, so connected
                    visitor.getCountryCode(),
                    visitor.getCountry(),
                    visitor.getCity(),
                    visitor.getBrowserName(),
                    visitor.getOsName(),
                    visitor.getDeviceType()
            );
            broadcaster.broadcastToProject(projectId, event);

            log.debug("[WidgetWS] Visitor page change: visitorId={}, url={}", visitorId, url);
        });
    }

    /**
     * Records a page view for the previous page with its duration.
     *
     * @param visitorId the visitor's internal ID
     */
    private void recordPreviousPageView(UUID visitorId) {
        PageTrackingState previous = pageTrackingState.get(visitorId);
        if (previous != null) {
            int durationMs = (int) ChronoUnit.MILLIS.between(previous.startedAt(), OffsetDateTime.now());
            savePageViewAsync(previous.projectId(), visitorId, previous.url(), previous.title(),
                    previous.startedAt(), durationMs);
        }
    }

    /**
     * Saves a page view record asynchronously to avoid blocking the WebSocket thread.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param url the page URL
     * @param title the page title
     * @param visitedAt when the page was visited
     * @param durationMs time spent on the page in milliseconds
     */
    @Async
    public void savePageViewAsync(UUID projectId, UUID visitorId, String url, String title,
                                   OffsetDateTime visitedAt, int durationMs) {
        try {
            LiveConnectPageView pageView = LiveConnectPageView.builder()
                    .visitorId(visitorId)
                    .projectId(projectId)
                    .url(url)
                    .title(title)
                    .visitedAt(visitedAt)
                    .durationMs(durationMs)
                    .build();
            pageViewRepository.save(pageView);
        } catch (Exception e) {
            log.warn("[WidgetWS] Failed to save page view: {}", e.getMessage());
        }
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
     * Extracts the current page title from visitor metadata.
     *
     * @param visitor the visitor entity
     * @return the current page title, or null if not set
     */
    private String extractCurrentPageTitle(LiveConnectVisitor visitor) {
        if (visitor.getMetadata() != null) {
            Object title = visitor.getMetadata().get("currentPageTitle");
            if (title != null) {
                return title.toString();
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
