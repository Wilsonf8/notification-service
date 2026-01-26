package com.notificationservice.controller;

import com.notificationservice.dto.WidgetInitRequest;
import com.notificationservice.dto.WidgetInitResponse;
import com.notificationservice.entity.LiveConnectEmbedKey;
import com.notificationservice.service.LiveConnectEmbedKeyService;
import com.notificationservice.service.LiveConnectRateLimitService;
import com.notificationservice.service.LiveConnectSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * Public API controller for LiveConnect widget endpoints.
 * These endpoints are called directly by the embedded widget from customer websites.
 */
@RestController
@RequestMapping("/v1/liveconnect")
@RequiredArgsConstructor
public class LiveConnectWidgetController {

    private final LiveConnectRateLimitService rateLimitService;
    private final LiveConnectEmbedKeyService embedKeyService;
    private final LiveConnectSessionService sessionService;

    /**
     * Initializes a widget session.
     *
     * @param embedKeyHeader the embed key from X-Embed-Key header
     * @param origin the Origin header for domain validation
     * @param request the init request containing visitor ID
     * @param httpRequest the HTTP request for IP extraction
     * @return the init response with session token and widget settings
     */
    @PostMapping("/init")
    public ResponseEntity<WidgetInitResponse> initWidget(
            @RequestHeader("X-Embed-Key") String embedKeyHeader,
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody WidgetInitRequest request,
            HttpServletRequest httpRequest) {

        // Extract client IP
        String clientIp = extractClientIp(httpRequest);

        // Check rate limit (IP only for init)
        rateLimitService.checkWidgetInit(clientIp);

        // Extract domain from Origin header
        String domain = extractDomain(origin);

        // Validate embed key and domain
        LiveConnectEmbedKey embedKey = embedKeyService.validateEmbedKey(embedKeyHeader, domain);

        // Initialize session
        WidgetInitResponse response = sessionService.initializeSession(request, embedKey);

        return ResponseEntity.ok(response);
    }

    /**
     * Extracts the client IP address from the request.
     * Checks X-Forwarded-For header first (for proxied requests), then falls back to remoteAddr.
     */
    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            // X-Forwarded-For can contain multiple IPs; take the first one (original client)
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Extracts the domain from an Origin header.
     * Example: "https://example.com:443" -> "example.com"
     */
    private String extractDomain(String origin) {
        if (origin == null || origin.isEmpty()) {
            return null;
        }
        try {
            URI uri = URI.create(origin);
            return uri.getHost();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}