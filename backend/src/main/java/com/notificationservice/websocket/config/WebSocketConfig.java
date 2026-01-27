package com.notificationservice.websocket.config;

import com.notificationservice.websocket.handler.RepWebSocketHandler;
import com.notificationservice.websocket.interceptor.RepHandshakeInterceptor;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

/**
 * WebSocket configuration for LiveConnect.
 * Note: Widget WebSocket uses JSR 356 native endpoint (WidgetWebSocketEndpoint).
 * This config only registers the rep dashboard handler.
 */
@Slf4j
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    @PostConstruct
    public void init() {
        log.info("[WebSocketConfig] WebSocket configuration initialized");
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        log.info("[WebSocketConfig] Creating WebSocket container");
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(8192);
        container.setMaxBinaryMessageBufferSize(8192);
        container.setMaxSessionIdleTimeout(600000L); // 10 minutes
        return container;
    }

    private final RepWebSocketHandler repWebSocketHandler;
    private final RepHandshakeInterceptor repHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        log.info("[WebSocketConfig] Registering WebSocket handlers...");

        // Rep dashboard: JWT cookie auth (web browser) or Authorization header/query string (Swift app)
        // Note: This will also need JSR 356 conversion for Railway compatibility
        registry.addHandler(repWebSocketHandler, "/api/projects/{projectId}/liveconnect/ws")
                .addInterceptors(repHandshakeInterceptor)
                .setAllowedOriginPatterns("*");
        log.info("[WebSocketConfig] Registered rep handler at /api/projects/{projectId}/liveconnect/ws");
    }
}