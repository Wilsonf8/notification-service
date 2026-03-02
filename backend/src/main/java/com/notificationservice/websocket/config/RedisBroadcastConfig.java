package com.notificationservice.websocket.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/**
 * Configuration for Redis-backed WebSocket broadcasting.
 * Only active when {@code app.websocket.broadcaster=redis} is set.
 */
@Configuration
@ConditionalOnProperty(name = "app.websocket.broadcaster", havingValue = "redis")
public class RedisBroadcastConfig {

    /**
     * Creates the Redis message listener container for Pub/Sub subscriptions.
     *
     * @param connectionFactory the Redis connection factory
     * @return configured listener container
     */
    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }
}
