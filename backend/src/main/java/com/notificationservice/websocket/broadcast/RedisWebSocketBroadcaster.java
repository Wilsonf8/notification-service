package com.notificationservice.websocket.broadcast;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.websocket.session.RepSessionManager;
import com.notificationservice.websocket.session.VisitorSessionManager;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * Redis Pub/Sub implementation of WebSocketBroadcaster.
 * Enables horizontal scaling by publishing events to Redis channels,
 * allowing all backend instances to receive and deliver to their local sessions.
 * <p>
 * Activate by setting {@code app.websocket.broadcaster=redis} in application properties.
 * Falls back to {@link InMemoryWebSocketBroadcaster} when not configured.
 */
@Component
@Primary
@ConditionalOnProperty(name = "app.websocket.broadcaster", havingValue = "redis")
@Slf4j
public class RedisWebSocketBroadcaster implements WebSocketBroadcaster {

    private static final String CHANNEL_PREFIX = "ws:broadcast:";

    private final RepSessionManager repSessionManager;
    private final VisitorSessionManager visitorSessionManager;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final RedisMessageListenerContainer listenerContainer;

    /**
     * @param repSessionManager     manages rep WebSocket sessions
     * @param visitorSessionManager manages visitor WebSocket sessions
     * @param objectMapper          JSON serializer
     * @param redisTemplate         Redis string operations
     * @param listenerContainer     Redis message listener container
     */
    public RedisWebSocketBroadcaster(
            RepSessionManager repSessionManager,
            VisitorSessionManager visitorSessionManager,
            ObjectMapper objectMapper,
            StringRedisTemplate redisTemplate,
            RedisMessageListenerContainer listenerContainer) {
        this.repSessionManager = repSessionManager;
        this.visitorSessionManager = visitorSessionManager;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        this.listenerContainer = listenerContainer;
    }

    /**
     * Subscribes to all broadcast channels using pattern matching.
     */
    @PostConstruct
    public void init() {
        listenerContainer.addMessageListener(
                new BroadcastListener(),
                new ChannelTopic(CHANNEL_PREFIX + "*")
        );
        log.info("Redis WebSocket broadcaster initialized");
    }

    @Override
    public void broadcastToProject(UUID projectId, Object event) {
        String message = serializeEvent(event);
        if (message != null) {
            redisTemplate.convertAndSend(CHANNEL_PREFIX + "project:" + projectId, message);
        }
    }

    @Override
    public void sendToRep(UUID userId, Object event) {
        String message = serializeEvent(event);
        if (message != null) {
            redisTemplate.convertAndSend(CHANNEL_PREFIX + "rep:" + userId, message);
        }
    }

    @Override
    public void sendToVisitor(UUID visitorId, Object event) {
        String message = serializeEvent(event);
        if (message != null) {
            redisTemplate.convertAndSend(CHANNEL_PREFIX + "visitor:" + visitorId, message);
        }
    }

    @Override
    public void broadcastToProjectVisitors(UUID projectId, Object event) {
        String message = serializeEvent(event);
        if (message != null) {
            redisTemplate.convertAndSend(CHANNEL_PREFIX + "project-visitors:" + projectId, message);
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
                    session.sendMessage(textMessage);
                } catch (IOException e) {
                    log.warn("Failed to send message to session {}: {}", session.getId(), e.getMessage());
                }
            }
        }
    }

    /**
     * Listener that receives Redis Pub/Sub messages and delivers to local WebSocket sessions.
     */
    private class BroadcastListener implements MessageListener {
        @Override
        public void onMessage(Message message, byte[] pattern) {
            String channel = new String(message.getChannel());
            String body = new String(message.getBody());

            String target = channel.substring(CHANNEL_PREFIX.length());
            String[] parts = target.split(":", 2);
            if (parts.length < 2) {
                log.warn("Invalid broadcast channel: {}", channel);
                return;
            }

            String type = parts[0];
            String id = parts[1];

            switch (type) {
                case "project" -> {
                    Set<WebSocketSession> sessions = repSessionManager.getProjectSessions(UUID.fromString(id));
                    sendToSessions(sessions, body);
                }
                case "rep" -> {
                    Set<WebSocketSession> sessions = repSessionManager.getUserSessions(UUID.fromString(id));
                    sendToSessions(sessions, body);
                }
                case "visitor" -> {
                    Set<WebSocketSession> sessions = visitorSessionManager.getVisitorSessions(UUID.fromString(id));
                    sendToSessions(sessions, body);
                }
                case "project-visitors" -> {
                    UUID projectId = UUID.fromString(id);
                    Set<UUID> visitorIds = visitorSessionManager.getProjectVisitors(projectId);
                    for (UUID visitorId : visitorIds) {
                        Set<WebSocketSession> sessions = visitorSessionManager.getVisitorSessions(visitorId);
                        sendToSessions(sessions, body);
                    }
                }
                default -> log.warn("Unknown broadcast type: {}", type);
            }
        }
    }
}
