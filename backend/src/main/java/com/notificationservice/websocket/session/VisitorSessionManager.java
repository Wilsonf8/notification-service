package com.notificationservice.websocket.session;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Thread-safe manager for visitor WebSocket sessions.
 * Tracks sessions by visitor ID to support multi-tab scenarios.
 */
@Component
@Slf4j
public class VisitorSessionManager {

    // visitorId -> Set<WebSocketSession> (visitor's sessions across tabs)
    private final Map<UUID, Set<WebSocketSession>> visitorSessions = new ConcurrentHashMap<>();

    // visitorId -> projectId mapping for broadcasts
    private final Map<UUID, UUID> visitorProjects = new ConcurrentHashMap<>();

    /**
     * Registers a new visitor WebSocket session.
     *
     * @param visitorId the visitor's internal ID
     * @param projectId the project ID
     * @param session the WebSocket session
     */
    public void addSession(UUID visitorId, UUID projectId, WebSocketSession session) {
        visitorSessions.computeIfAbsent(visitorId, k -> new CopyOnWriteArraySet<>()).add(session);
        visitorProjects.put(visitorId, projectId);
        log.debug("Visitor session added: visitorId={}, projectId={}, sessionId={}", visitorId, projectId, session.getId());
    }

    /**
     * Removes a visitor WebSocket session.
     *
     * @param visitorId the visitor's internal ID
     * @param session the WebSocket session
     */
    public void removeSession(UUID visitorId, WebSocketSession session) {
        Set<WebSocketSession> sessions = visitorSessions.get(visitorId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                visitorSessions.remove(visitorId);
                visitorProjects.remove(visitorId);
            }
        }
        log.debug("Visitor session removed: visitorId={}, sessionId={}", visitorId, session.getId());
    }

    /**
     * Gets all active sessions for a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @return set of WebSocket sessions, or empty set if none
     */
    public Set<WebSocketSession> getVisitorSessions(UUID visitorId) {
        return visitorSessions.getOrDefault(visitorId, Collections.emptySet());
    }

    /**
     * Gets the project ID for a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @return the project ID, or null if visitor not found
     */
    public UUID getVisitorProject(UUID visitorId) {
        return visitorProjects.get(visitorId);
    }

    /**
     * Checks if a visitor has any active sessions.
     *
     * @param visitorId the visitor's internal ID
     * @return true if visitor has at least one active session
     */
    public boolean hasActiveSessions(UUID visitorId) {
        Set<WebSocketSession> sessions = visitorSessions.get(visitorId);
        return sessions != null && !sessions.isEmpty();
    }

    /**
     * Gets the count of active sessions for a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @return number of active sessions
     */
    public int getSessionCount(UUID visitorId) {
        Set<WebSocketSession> sessions = visitorSessions.get(visitorId);
        return sessions != null ? sessions.size() : 0;
    }

    /**
     * Gets all visitor IDs that have active sessions for a specific project.
     *
     * @param projectId the project ID
     * @return set of visitor IDs
     */
    public Set<UUID> getProjectVisitors(UUID projectId) {
        Set<UUID> visitors = ConcurrentHashMap.newKeySet();
        visitorProjects.forEach((visitorId, projId) -> {
            if (projId.equals(projectId)) {
                visitors.add(visitorId);
            }
        });
        return visitors;
    }
}