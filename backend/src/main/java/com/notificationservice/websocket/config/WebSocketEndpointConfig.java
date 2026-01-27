package com.notificationservice.websocket.config;

import com.notificationservice.websocket.endpoint.WidgetWebSocketEndpoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

/**
 * Configuration for JSR 356 WebSocket endpoints.
 */
@Slf4j
@Configuration
public class WebSocketEndpointConfig {

    @Bean
    public ServerEndpointExporter serverEndpointExporter() {
        log.info("[WebSocketEndpointConfig] Registering ServerEndpointExporter for JSR 356 endpoints");
        ServerEndpointExporter exporter = new ServerEndpointExporter();
        // Explicitly register the endpoint class
        exporter.setAnnotatedEndpointClasses(WidgetWebSocketEndpoint.class);
        log.info("[WebSocketEndpointConfig] Registered WidgetWebSocketEndpoint at /v1/liveconnect/ws");
        return exporter;
    }
}
