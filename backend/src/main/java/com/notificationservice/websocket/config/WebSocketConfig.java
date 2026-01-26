package com.notificationservice.websocket.config;

import com.notificationservice.websocket.handler.RepWebSocketHandler;
import com.notificationservice.websocket.handler.WidgetWebSocketHandler;
import com.notificationservice.websocket.interceptor.RepHandshakeInterceptor;
import com.notificationservice.websocket.interceptor.WidgetHandshakeInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket configuration for LiveConnect.
 * Registers handlers for rep dashboard and widget connections.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final RepWebSocketHandler repWebSocketHandler;
    private final WidgetWebSocketHandler widgetWebSocketHandler;
    private final RepHandshakeInterceptor repHandshakeInterceptor;
    private final WidgetHandshakeInterceptor widgetHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Rep dashboard: JWT cookie auth (web browser) or Authorization header/query string (Swift app)
        registry.addHandler(repWebSocketHandler, "/api/projects/{projectId}/liveconnect/ws")
                .addInterceptors(repHandshakeInterceptor)
                .setAllowedOriginPatterns("*");

        // Widget: Session token in query string
        registry.addHandler(widgetWebSocketHandler, "/v1/liveconnect/ws")
                .addInterceptors(widgetHandshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }
}