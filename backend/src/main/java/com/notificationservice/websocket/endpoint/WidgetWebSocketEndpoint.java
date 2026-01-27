package com.notificationservice.websocket.endpoint;

import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * JSR 356 WebSocket endpoint for testing.
 * This bypasses Spring's WebSocket abstraction to test if Tomcat's native WebSocket works.
 */
@Slf4j
@Component
@ServerEndpoint("/v1/liveconnect/ws-native")
public class WidgetWebSocketEndpoint {

    @OnOpen
    public void onOpen(Session session) {
        log.info("[NativeWS] Connection opened: {}", session.getId());
        try {
            session.getBasicRemote().sendText("{\"type\":\"connected\",\"message\":\"Native WebSocket works!\"}");
        } catch (Exception e) {
            log.error("[NativeWS] Error sending message", e);
        }
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        log.info("[NativeWS] Message received: {}", message);
        try {
            session.getBasicRemote().sendText("{\"type\":\"echo\",\"message\":\"" + message + "\"}");
        } catch (Exception e) {
            log.error("[NativeWS] Error sending message", e);
        }
    }

    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        log.info("[NativeWS] Connection closed: {} - {}", session.getId(), closeReason);
    }

    @OnError
    public void onError(Session session, Throwable error) {
        log.error("[NativeWS] Error: {}", error.getMessage(), error);
    }
}
