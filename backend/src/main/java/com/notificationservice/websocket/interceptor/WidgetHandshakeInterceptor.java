package com.notificationservice.websocket.interceptor;

import com.notificationservice.entity.LiveConnectSession;
import com.notificationservice.service.LiveConnectSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

/**
 * Handshake interceptor for widget WebSocket connections.
 * Extracts and validates session token from query string before WebSocket upgrade.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WidgetHandshakeInterceptor implements HandshakeInterceptor {

    private final LiveConnectSessionService sessionService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        try {
            // Extract token from query string: ?token=sess_...
            String token = UriComponentsBuilder.fromUri(request.getURI())
                    .build().getQueryParams().getFirst("token");

            if (token == null || token.isBlank()) {
                log.warn("[WidgetWS] Handshake failed: No session token provided");
                return false;
            }

            // Validate session token
            LiveConnectSession liveConnectSession;
            try {
                liveConnectSession = sessionService.validateSession(token);
            } catch (Exception e) {
                log.warn("[WidgetWS] Handshake failed: Invalid session token - {}", e.getMessage());
                return false;
            }

            UUID projectId = liveConnectSession.getProject().getId();
            UUID visitorId = liveConnectSession.getVisitor().getId();

            // Store attributes for use in handler
            attributes.put("projectId", projectId);
            attributes.put("visitorId", visitorId);
            attributes.put("token", token);

            log.debug("[WidgetWS] Handshake successful: projectId={}, visitorId={}", projectId, visitorId);
            return true;

        } catch (Exception e) {
            log.error("[WidgetWS] Handshake failed with exception", e);
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // No-op
    }
}
