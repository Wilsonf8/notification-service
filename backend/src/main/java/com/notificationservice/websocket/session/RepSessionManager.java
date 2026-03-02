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
 * Thread-safe manager for rep WebSocket sessions.
 * Tracks sessions by project ID and user ID to support multi-tab scenarios.
 */
@Component
@Slf4j
public class RepSessionManager {

    // projectId -> Set<WebSocketSession> (all reps in project)
    private final Map<UUID, Set<WebSocketSession>> projectSessions = new ConcurrentHashMap<>();

    // userId -> Set<WebSocketSession> (specific rep's sessions across tabs)
    private final Map<UUID, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    /**
     * Registers a new rep WebSocket session.
     *
     * @param projectId the project ID
     * @param userId the rep's user ID
     * @param session the WebSocket session
     */
    public void addSession(UUID projectId, UUID userId, WebSocketSession session) {
        projectSessions.computeIfAbsent(projectId, k -> new CopyOnWriteArraySet<>()).add(session);
        userSessions.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(session);
        log.debug("Rep session added: projectId={}, userId={}, sessionId={}", projectId, userId, session.getId());
    }

    /**
     * Removes a rep WebSocket session. Uses compute() for atomic check-and-remove
     * to prevent TOCTOU race conditions between isEmpty() and remove().
     *
     * @param projectId the project ID
     * @param userId the rep's user ID
     * @param session the WebSocket session
     */
    public void removeSession(UUID projectId, UUID userId, WebSocketSession session) {
        projectSessions.compute(projectId, (key, sessions) -> {
            if (sessions == null) return null;
            sessions.remove(session);
            return sessions.isEmpty() ? null : sessions;
        });

        userSessions.compute(userId, (key, sessions) -> {
            if (sessions == null) return null;
            sessions.remove(session);
            return sessions.isEmpty() ? null : sessions;
        });
        log.debug("Rep session removed: projectId={}, userId={}, sessionId={}", projectId, userId, session.getId());
    }

    /**
     * Gets all active sessions for a project.
     *
     * @param projectId the project ID
     * @return set of WebSocket sessions, or empty set if none
     */
    public Set<WebSocketSession> getProjectSessions(UUID projectId) {
        return projectSessions.getOrDefault(projectId, Collections.emptySet());
    }

    /**
     * Gets all active sessions for a specific rep user.
     *
     * @param userId the user ID
     * @return set of WebSocket sessions, or empty set if none
     */
    public Set<WebSocketSession> getUserSessions(UUID userId) {
        return userSessions.getOrDefault(userId, Collections.emptySet());
    }

    /**
     * Checks if a user has any active sessions.
     *
     * @param userId the user ID
     * @return true if user has at least one active session
     */
    public boolean hasActiveSessions(UUID userId) {
        Set<WebSocketSession> sessions = userSessions.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    /**
     * Gets the count of active sessions for a user.
     *
     * @param userId the user ID
     * @return number of active sessions
     */
    public int getSessionCount(UUID userId) {
        Set<WebSocketSession> sessions = userSessions.get(userId);
        return sessions != null ? sessions.size() : 0;
    }
}