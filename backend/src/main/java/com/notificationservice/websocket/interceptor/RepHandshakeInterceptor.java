package com.notificationservice.websocket.interceptor;

import com.notificationservice.security.JwtTokenProvider;
import com.notificationservice.service.LiveConnectRepService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handshake interceptor for rep WebSocket connections.
 * Supports multiple authentication methods:
 * 1. Authorization header: "Bearer {jwt}" (Swift app preferred)
 * 2. Query string: ?token={jwt} (Swift app fallback)
 * 3. Cookie: token={jwt} (Web browser automatic)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RepHandshakeInterceptor implements HandshakeInterceptor {

    private static final Pattern PROJECT_ID_PATTERN = Pattern.compile("/api/projects/([^/]+)/liveconnect/ws");
    private static final String TOKEN_COOKIE_NAME = "token";

    private final JwtTokenProvider jwtTokenProvider;
    private final LiveConnectRepService repService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        log.info("Rep handshake attempt: URI={}", request.getURI());

        try {
            // Extract project ID from URL path
            UUID projectId = extractProjectId(request);
            if (projectId == null) {
                log.warn("Rep handshake failed: Could not extract project ID from URL: {}", request.getURI().getPath());
                return false;
            }
            log.info("Rep handshake: projectId={}", projectId);

            // Extract and validate JWT
            HttpServletRequest httpRequest = null;
            if (request instanceof ServletServerHttpRequest servletRequest) {
                httpRequest = servletRequest.getServletRequest();
            }

            String jwt = extractJwt(request, httpRequest);
            if (jwt == null || jwt.isBlank()) {
                log.warn("Rep handshake failed: No JWT found. Query: {}", request.getURI().getQuery());
                return false;
            }
            log.info("Rep handshake: JWT found, length={}", jwt.length());

            if (!jwtTokenProvider.validateToken(jwt)) {
                log.warn("Rep handshake failed: Invalid JWT");
                return false;
            }
            log.info("Rep handshake: JWT validated successfully");

            UUID userId = jwtTokenProvider.getUserIdFromToken(jwt);

            // Verify user is a rep for this project
            try {
                repService.verifyRepAccess(projectId, userId);
            } catch (Exception e) {
                log.warn("Rep handshake failed: User {} is not a rep for project {}", userId, projectId);
                return false;
            }

            // Extract deviceSessionId from query params (fallback to random UUID for backwards compatibility)
            String deviceSessionId = UriComponentsBuilder.fromUri(request.getURI())
                    .build().getQueryParams().getFirst("deviceSessionId");
            if (deviceSessionId == null || deviceSessionId.isBlank()) {
                deviceSessionId = UUID.randomUUID().toString();
            }

            // Store attributes for use in handler
            attributes.put("projectId", projectId);
            attributes.put("userId", userId);
            attributes.put("deviceSessionId", deviceSessionId);

            log.debug("Rep handshake successful: projectId={}, userId={}", projectId, userId);
            return true;

        } catch (Exception e) {
            log.error("Rep handshake failed with exception", e);
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

    private UUID extractProjectId(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        Matcher matcher = PROJECT_ID_PATTERN.matcher(path);
        if (matcher.find()) {
            try {
                return UUID.fromString(matcher.group(1));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid project ID format in URL: {}", matcher.group(1));
                return null;
            }
        }
        return null;
    }

    /**
     * Extracts JWT from request using priority order:
     * 1. Authorization header: "Bearer {jwt}"
     * 2. Query string: ?token={jwt}
     * 3. Cookie: token={jwt}
     */
    private String extractJwt(ServerHttpRequest request, HttpServletRequest httpRequest) {
        // 1. Check Authorization header
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        // 2. Check query string
        String queryToken = UriComponentsBuilder.fromUri(request.getURI())
                .build().getQueryParams().getFirst("token");
        if (queryToken != null && !queryToken.isBlank()) {
            return queryToken;
        }

        // 3. Check cookie
        if (httpRequest != null) {
            return extractJwtFromCookies(httpRequest);
        }

        return null;
    }

    private String extractJwtFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}