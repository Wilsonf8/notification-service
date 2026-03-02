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

    // projectId -> Set<visitorId> reverse index for O(1) project visitor lookups
    private final Map<UUID, Set<UUID>> projectVisitors = new ConcurrentHashMap<>();

    // visitorId -> engagement state cache (avoids DB queries on page change/broadcast decisions)
    private final Map<UUID, VisitorEngagementState> visitorStates = new ConcurrentHashMap<>();

    /**
     * Visitor engagement states for in-memory broadcast filtering.
     */
    public enum VisitorEngagementState {
        BROWSING,
        WAITING,
        IN_CALL
    }

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
        projectVisitors.computeIfAbsent(projectId, k -> ConcurrentHashMap.newKeySet()).add(visitorId);
        log.debug("Visitor session added: visitorId={}, projectId={}, sessionId={}", visitorId, projectId, session.getId());
    }

    /**
     * Removes a visitor WebSocket session. Uses compute() for atomic check-and-remove
     * to prevent TOCTOU race conditions between isEmpty() and remove().
     *
     * @param visitorId the visitor's internal ID
     * @param session the WebSocket session
     */
    public void removeSession(UUID visitorId, WebSocketSession session) {
        visitorSessions.compute(visitorId, (key, sessions) -> {
            if (sessions == null) return null;
            sessions.remove(session);
            if (sessions.isEmpty()) {
                UUID projectId = visitorProjects.remove(visitorId);
                visitorStates.remove(visitorId);
                // Remove from reverse index atomically
                if (projectId != null) {
                    projectVisitors.compute(projectId, (pk, visitors) -> {
                        if (visitors == null) return null;
                        visitors.remove(visitorId);
                        return visitors.isEmpty() ? null : visitors;
                    });
                }
                return null; // Remove entry
            }
            return sessions;
        });
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
        return projectVisitors.getOrDefault(projectId, Collections.emptySet());
    }

    /**
     * Sets the engagement state for a visitor. Called when requests are
     * created/expired/accepted and when calls start/end.
     *
     * @param visitorId the visitor's internal ID
     * @param state the new engagement state
     */
    public void setVisitorState(UUID visitorId, VisitorEngagementState state) {
        visitorStates.put(visitorId, state);
        log.debug("Visitor state changed: visitorId={}, state={}", visitorId, state);
    }

    /**
     * Gets the engagement state for a visitor. Defaults to BROWSING if not set.
     *
     * @param visitorId the visitor's internal ID
     * @return the visitor's engagement state
     */
    public VisitorEngagementState getVisitorState(UUID visitorId) {
        return visitorStates.getOrDefault(visitorId, VisitorEngagementState.BROWSING);
    }

    /**
     * Checks if a visitor is in BROWSING state (not waiting or in a call).
     *
     * @param visitorId the visitor's internal ID
     * @return true if the visitor is browsing
     */
    public boolean isBrowsing(UUID visitorId) {
        return getVisitorState(visitorId) == VisitorEngagementState.BROWSING;
    }

    /**
     * Removes the engagement state for a visitor (on full disconnect).
     *
     * @param visitorId the visitor's internal ID
     */
    public void removeVisitorState(UUID visitorId) {
        visitorStates.remove(visitorId);
    }
}