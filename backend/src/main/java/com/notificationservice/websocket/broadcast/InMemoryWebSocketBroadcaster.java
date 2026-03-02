package com.notificationservice.websocket.broadcast;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.websocket.session.RepSessionManager;
import com.notificationservice.websocket.session.VisitorSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * In-memory implementation of WebSocketBroadcaster.
 * Suitable for single-instance deployments. For horizontal scaling,
 * enable the Redis broadcaster with {@code app.websocket.broadcaster=redis}.
 */
@Component
@ConditionalOnProperty(name = "app.websocket.broadcaster", havingValue = "in-memory", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class InMemoryWebSocketBroadcaster implements WebSocketBroadcaster {

    private final RepSessionManager repSessionManager;
    private final VisitorSessionManager visitorSessionManager;
    private final ObjectMapper objectMapper;

    @Override
    public void broadcastToProject(UUID projectId, Object event) {
        Set<WebSocketSession> sessions = repSessionManager.getProjectSessions(projectId);
        String message = serializeEvent(event);
        if (message == null) {
            return;
        }

        log.debug("Broadcasting to project {}: {} sessions", projectId, sessions.size());
        sendToSessions(sessions, message);
    }

    @Override
    public void sendToRep(UUID userId, Object event) {
        Set<WebSocketSession> sessions = repSessionManager.getUserSessions(userId);
        String message = serializeEvent(event);
        if (message == null) {
            return;
        }

        log.debug("Sending to rep {}: {} sessions", userId, sessions.size());
        sendToSessions(sessions, message);
    }

    @Override
    public void sendToVisitor(UUID visitorId, Object event) {
        Set<WebSocketSession> sessions = visitorSessionManager.getVisitorSessions(visitorId);
        String message = serializeEvent(event);
        if (message == null) {
            return;
        }

        log.debug("Sending to visitor {}: {} sessions", visitorId, sessions.size());
        sendToSessions(sessions, message);
    }

    @Override
    public void broadcastToProjectVisitors(UUID projectId, Object event) {
        Set<UUID> visitorIds = visitorSessionManager.getProjectVisitors(projectId);
        String message = serializeEvent(event);
        if (message == null) {
            return;
        }

        log.debug("Broadcasting to project {} visitors: {} visitors", projectId, visitorIds.size());
        for (UUID visitorId : visitorIds) {
            Set<WebSocketSession> sessions = visitorSessionManager.getVisitorSessions(visitorId);
            sendToSessions(sessions, message);
        }
    }

    private String serializeEvent(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize event: {}", event.getClass().getSimpleName(), e);
            return null;
        }
    }

    private void sendToSessions(Set<WebSocketSession> sessions, String message) {
        TextMessage textMessage = new TextMessage(message);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    // Sessions are wrapped with ConcurrentWebSocketSessionDecorator
                    // at registration time, so sends are non-blocking and buffered.
                    session.sendMessage(textMessage);
                } catch (IOException e) {
                    log.warn("Failed to send message to session {}: {}", session.getId(), e.getMessage());
                }
            }
        }
    }
}