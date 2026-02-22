package com.notificationservice.controller;

import com.notificationservice.dto.AcceptPingResponse;
import com.notificationservice.dto.ContactFormRequest;
import com.notificationservice.dto.LiveConnectMessageDto;
import com.notificationservice.dto.MessageResponse;
import com.notificationservice.dto.RequestResponse;
import com.notificationservice.dto.SendMessageRequest;
import com.notificationservice.dto.TokenRequest;
import com.notificationservice.dto.TokenResponse;
import com.notificationservice.dto.WidgetInitRequest;
import com.notificationservice.dto.WidgetInitResponse;
import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectEmbedKey;
import com.notificationservice.entity.LiveConnectSession;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.service.AccessDeniedException;
import com.notificationservice.service.LiveConnectContactService;
import com.notificationservice.service.LiveConnectConversationService;
import com.notificationservice.service.LiveConnectEmbedKeyService;
import com.notificationservice.service.LiveConnectRateLimitService;
import com.notificationservice.service.LiveConnectRequestService;
import com.notificationservice.service.LiveConnectSessionService;
import com.notificationservice.service.LiveKitTokenService;
import com.notificationservice.service.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Public API controller for LiveConnect widget endpoints.
 * These endpoints are called directly by the embedded widget from customer websites.
 */
@Slf4j
@RestController
@RequestMapping("/v1/liveconnect")
@RequiredArgsConstructor
public class LiveConnectWidgetController {

    private final LiveConnectRateLimitService rateLimitService;
    private final LiveConnectEmbedKeyService embedKeyService;
    private final LiveConnectSessionService sessionService;
    private final LiveConnectRequestService requestService;
    private final LiveConnectContactService contactService;
    private final LiveConnectConversationService conversationService;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveKitTokenService liveKitTokenService;

    /**
     * Simple health check for the widget API.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        log.info("[LiveConnect] Health check called");
        return ResponseEntity.ok("OK");
    }

    /**
     * WebSocket test endpoint - verifies the path is reachable.
     */
    @GetMapping("/ws-test")
    public ResponseEntity<String> wsTest() {
        log.info("[LiveConnect] WebSocket test endpoint called");
        return ResponseEntity.ok("WebSocket path is reachable");
    }

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

        log.info("[LiveConnect] Init request received - embedKey: {}..., origin: {}, visitorId: {}",
                embedKeyHeader != null && embedKeyHeader.length() > 10 ? embedKeyHeader.substring(0, 10) : embedKeyHeader,
                origin,
                request.visitorId());

        // Extract client IP
        String clientIp = extractClientIp(httpRequest);
        log.debug("[LiveConnect] Client IP: {}", clientIp);

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
     * Gets a LiveKit token for an active conversation.
     * Used for reconnection scenarios (e.g., page refresh during a call).
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param request the token request containing conversation ID
     * @return the token response with LiveKit token and room info
     */
    @PostMapping("/token")
    public ResponseEntity<TokenResponse> getToken(
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody TokenRequest request) {

        LiveConnectSession session = sessionService.validateSession(sessionToken);

        LiveConnectConversation conversation = conversationRepository.findById(request.conversationId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        // Verify visitor owns this conversation
        if (!conversation.getVisitor().getId().equals(session.getVisitor().getId())) {
            throw new AccessDeniedException("Not your conversation");
        }

        // Verify conversation is active
        if (conversation.getStatus() != ConversationStatus.ACTIVE) {
            throw new IllegalArgumentException("Conversation is not active");
        }

        String token = liveKitTokenService.generateToken(
                conversation.getLiveKitRoomName(),
                "visitor_" + session.getVisitor().getId(),
                session.getVisitor().getName() != null ? session.getVisitor().getName() : "Visitor"
        );

        return ResponseEntity.ok(new TokenResponse(
                token,
                conversation.getLiveKitRoomName(),
                liveKitTokenService.getLiveKitUrl()
        ));
    }

    /**
     * Requests a call with any available rep.
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param httpRequest the HTTP request for IP extraction
     * @return the request response with request ID and expiration time
     */
    @PostMapping("/request")
    public ResponseEntity<RequestResponse> requestCall(
            @RequestHeader("X-Session-Token") String sessionToken,
            HttpServletRequest httpRequest) {

        String clientIp = extractClientIp(httpRequest);
        LiveConnectSession session = sessionService.validateSession(sessionToken);

        rateLimitService.checkRequestCall(session.getVisitor().getVisitorId(), clientIp);

        RequestResponse response = requestService.createVisitorRequest(
                session.getProject().getId(),
                session.getVisitor()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Cancels a pending request.
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param requestId the request ID to cancel
     * @return no content on success
     */
    @PostMapping("/request/{requestId}/cancel")
    public ResponseEntity<Void> cancelRequest(
            @RequestHeader("X-Session-Token") String sessionToken,
            @PathVariable UUID requestId) {

        LiveConnectSession session = sessionService.validateSession(sessionToken);

        requestService.cancelRequest(requestId, session.getVisitor().getId());

        return ResponseEntity.noContent().build();
    }

    /**
     * Accepts a rep's ping and starts the call.
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param requestId the ping request ID to accept
     * @return the accept response with conversation details and LiveKit tokens
     */
    @PostMapping("/ping/{requestId}/accept")
    public ResponseEntity<AcceptPingResponse> acceptPing(
            @RequestHeader("X-Session-Token") String sessionToken,
            @PathVariable UUID requestId) {

        LiveConnectSession session = sessionService.validateSession(sessionToken);

        AcceptPingResponse response = requestService.visitorAcceptsPing(
                requestId,
                session.getVisitor().getId()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Declines a rep's ping.
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param requestId the ping request ID to decline
     * @return no content on success
     */
    @PostMapping("/ping/{requestId}/decline")
    public ResponseEntity<Void> declinePing(
            @RequestHeader("X-Session-Token") String sessionToken,
            @PathVariable UUID requestId) {

        LiveConnectSession session = sessionService.validateSession(sessionToken);

        requestService.visitorDeclinesPing(requestId, session.getVisitor().getId());

        return ResponseEntity.noContent().build();
    }

    /**
     * Submits a contact form when reps are offline.
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param request the contact form data
     * @param httpRequest the HTTP request for IP extraction
     * @return ok on success
     */
    @PostMapping("/contact")
    public ResponseEntity<Void> submitContact(
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody ContactFormRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = extractClientIp(httpRequest);
        LiveConnectSession session = sessionService.validateSession(sessionToken);

        rateLimitService.checkLeaveContact(session.getVisitor().getVisitorId(), clientIp);

        contactService.submitContactForm(session, request);

        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieves chat messages for a conversation.
     * Used by the visitor widget when loading chat history (e.g., pop-out tab).
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param conversationId the conversation ID
     * @param httpRequest the HTTP request for IP extraction
     * @return list of messages in chronological order
     */
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<LiveConnectMessageDto>> getMessages(
            @RequestHeader("X-Session-Token") String sessionToken,
            @PathVariable UUID conversationId,
            HttpServletRequest httpRequest) {

        String clientIp = extractClientIp(httpRequest);
        LiveConnectSession session = sessionService.validateSession(sessionToken);
        rateLimitService.checkInCallMessage(session.getVisitor().getVisitorId(), clientIp);

        List<LiveConnectMessageDto> messages = conversationService.getVisitorMessages(
                conversationId, session.getVisitor().getId());
        return ResponseEntity.ok(messages);
    }

    /**
     * Sends a chat message during an active call.
     *
     * @param sessionToken the session token from X-Session-Token header
     * @param conversationId the conversation ID
     * @param request the message content
     * @param httpRequest the HTTP request for IP extraction
     * @return the message response with message ID and timestamp
     */
    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @RequestHeader("X-Session-Token") String sessionToken,
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = extractClientIp(httpRequest);
        LiveConnectSession session = sessionService.validateSession(sessionToken);

        rateLimitService.checkInCallMessage(session.getVisitor().getVisitorId(), clientIp);

        MessageResponse response = conversationService.sendVisitorMessage(
                conversationId,
                session.getVisitor().getId(),
                request.content(),
                request.messageId()
        );

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