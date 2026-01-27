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

/**
 * Handshake interceptor for widget WebSocket connections.
 * Authenticates via session token in query string.
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

        log.info("[WidgetWS] Handshake attempt from: {}", request.getURI());

        try {
            // Extract session token from query string (supports both "token" and "session" params)
            var queryParams = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
            log.info("[WidgetWS] Query params: {}", queryParams);

            String sessionToken = queryParams.getFirst("token");
            if (sessionToken == null) {
                sessionToken = queryParams.getFirst("session");
            }

            if (sessionToken == null || sessionToken.isBlank()) {
                log.warn("[WidgetWS] Handshake failed: No session token provided");
                return false;
            }

            log.info("[WidgetWS] Session token found: {}...", sessionToken.substring(0, Math.min(20, sessionToken.length())));

            // Validate session
            LiveConnectSession session;
            try {
                log.info("[WidgetWS] Validating session token...");
                session = sessionService.validateSession(sessionToken);
                log.info("[WidgetWS] Session valid: sessionId={}", session.getId());
            } catch (Exception e) {
                log.warn("[WidgetWS] Handshake failed: Invalid or expired session token - {}", e.getMessage());
                return false;
            }

            // Store attributes for use in handler
            attributes.put("sessionId", session.getId());
            attributes.put("sessionToken", sessionToken);
            attributes.put("projectId", session.getProject().getId());
            attributes.put("visitorId", session.getVisitor().getId());

            log.debug("Widget handshake successful: sessionId={}, visitorId={}, projectId={}",
                    session.getId(), session.getVisitor().getId(), session.getProject().getId());
            return true;

        } catch (Exception e) {
            log.error("Widget handshake failed with exception", e);
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