package com.notificationservice.controller;

import com.notificationservice.dto.AcceptRequestResponse;
import com.notificationservice.dto.AddRepRequest;
import com.notificationservice.dto.ConversationListResponse;
import com.notificationservice.dto.LiveConnectConversationDto;
import com.notificationservice.dto.LiveConnectMessageDto;
import com.notificationservice.dto.LiveConnectRepDto;
import com.notificationservice.dto.LiveConnectRequestDto;
import com.notificationservice.dto.MessageListResponse;
import com.notificationservice.dto.PingVisitorResponse;
import com.notificationservice.dto.SendMessageRequest;
import com.notificationservice.dto.TokenResponse;
import com.notificationservice.dto.UpdateAvailabilityRequest;
import com.notificationservice.dto.VisitorListResponse;
import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.service.LiveKitTokenService;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.service.AccessDeniedException;
import com.notificationservice.service.LiveConnectConversationService;
import com.notificationservice.service.LiveConnectRepService;
import com.notificationservice.service.LiveConnectRequestService;
import com.notificationservice.service.LiveConnectVisitorService;
import com.notificationservice.service.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for LiveConnect rep dashboard.
 * Handles rep management, visitor listing, and request handling.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/liveconnect")
@RequiredArgsConstructor
public class LiveConnectDashboardController {

    private final LiveConnectRepService repService;
    private final LiveConnectVisitorService visitorService;
    private final LiveConnectRequestService requestService;
    private final LiveConnectConversationService conversationService;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveKitTokenService liveKitTokenService;

    // Rep Management Endpoints

    /**
     * Gets all reps for a project.
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID
     * @return list of reps
     */
    @GetMapping("/reps")
    public ResponseEntity<List<LiveConnectRepDto>> getReps(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(repService.getReps(projectId, userId));
    }

    /**
     * Adds a user as a rep to a project.
     *
     * @param projectId the project ID
     * @param request the add rep request
     * @param userId the authenticated user's ID
     * @return the created rep
     */
    @PostMapping("/reps")
    public ResponseEntity<LiveConnectRepDto> addRep(
            @PathVariable UUID projectId,
            @Valid @RequestBody AddRepRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(repService.addRep(projectId, request, userId));
    }

    /**
     * Removes a rep from a project.
     *
     * @param projectId the project ID
     * @param repUserId the user ID of the rep to remove
     * @param userId the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/reps/{repUserId}")
    public ResponseEntity<Void> removeRep(
            @PathVariable UUID projectId,
            @PathVariable UUID repUserId,
            @AuthenticationPrincipal UUID userId) {
        repService.removeRep(projectId, repUserId, userId);
        return ResponseEntity.noContent().build();
    }

    // Availability Endpoint

    /**
     * Updates the calling user's availability for a project.
     *
     * @param projectId the project ID
     * @param request the update availability request
     * @param userId the authenticated user's ID (must be a rep)
     * @return the updated rep
     */
    @PutMapping("/availability")
    public ResponseEntity<LiveConnectRepDto> updateAvailability(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateAvailabilityRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(repService.updateAvailability(projectId, request, userId));
    }

    // Visitor Endpoints

    /**
     * Gets visitors for the dashboard (browsing + queue).
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return visitor list with browsing and queue sections
     */
    @GetMapping("/visitors")
    public ResponseEntity<VisitorListResponse> getVisitors(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(visitorService.getVisitors(projectId, userId));
    }

    /**
     * Pings a visitor (rep initiates request to connect).
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return ping response with request ID and expiry
     */
    @PostMapping("/visitors/{visitorId}/ping")
    public ResponseEntity<PingVisitorResponse> pingVisitor(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(visitorService.pingVisitor(projectId, visitorId, userId));
    }

    // Request Endpoints

    /**
     * Gets pending requests for a project.
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return list of pending requests
     */
    @GetMapping("/requests")
    public ResponseEntity<List<LiveConnectRequestDto>> getRequests(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(requestService.getPendingRequests(projectId, userId));
    }

    /**
     * Accepts a request and creates a conversation.
     *
     * @param projectId the project ID
     * @param requestId the request ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return accept response with conversation details
     */
    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<AcceptRequestResponse> acceptRequest(
            @PathVariable UUID projectId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(requestService.acceptRequest(projectId, requestId, userId));
    }

    /**
     * Dismisses a request.
     *
     * @param projectId the project ID
     * @param requestId the request ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return no content on success
     */
    @PostMapping("/requests/{requestId}/dismiss")
    public ResponseEntity<Void> dismissRequest(
            @PathVariable UUID projectId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal UUID userId) {
        requestService.dismissRequest(projectId, requestId, userId);
        return ResponseEntity.noContent().build();
    }

    // Conversation Endpoints

    /**
     * Gets paginated conversations for a project.
     *
     * @param projectId the project ID
     * @param page the page number (0-indexed)
     * @param size the page size
     * @param status optional status filter (ACTIVE, ENDED)
     * @param type optional type filter (VIDEO_CALL, CONTACT_FORM)
     * @param userId the authenticated user's ID
     * @return paginated list of conversations
     */
    @GetMapping("/conversations")
    public ResponseEntity<ConversationListResponse> getConversations(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(conversationService.getConversations(projectId, userId, page, size, status, type));
    }

    /**
     * Gets a single conversation by ID.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param userId the authenticated user's ID
     * @return the conversation details
     */
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<LiveConnectConversationDto> getConversation(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(conversationService.getConversation(projectId, conversationId, userId));
    }

    /**
     * Gets paginated messages for a conversation.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param page the page number (0-indexed)
     * @param size the page size
     * @param userId the authenticated user's ID
     * @return paginated list of messages
     */
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<MessageListResponse> getMessages(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(conversationService.getMessages(projectId, conversationId, userId, page, size));
    }

    /**
     * Sends a message in a conversation.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param request the message request
     * @param userId the authenticated user's ID (must be the assigned rep)
     * @return the created message
     */
    @PostMapping("/conversations/{conversationId}/message")
    public ResponseEntity<LiveConnectMessageDto> sendMessage(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(conversationService.sendMessage(projectId, conversationId, request, userId));
    }

    /**
     * Ends an active conversation.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param userId the authenticated user's ID (must be the assigned rep)
     * @return no content on success
     */
    @PostMapping("/conversations/{conversationId}/end")
    public ResponseEntity<Void> endConversation(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UUID userId) {
        conversationService.endConversation(projectId, conversationId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Gets a LiveKit token for an active conversation.
     * Used for reconnection scenarios (e.g., page refresh during a call).
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param userId the authenticated user's ID (must be the assigned rep)
     * @return the token response with LiveKit token and room info
     */
    @PostMapping("/conversations/{conversationId}/token")
    public ResponseEntity<TokenResponse> getRepToken(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UUID userId) {

        // Verify rep access to project
        LiveConnectRep rep = repService.verifyRepAccess(projectId, userId);

        LiveConnectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        // Verify conversation belongs to this project
        if (!conversation.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Conversation not found");
        }

        // Verify this rep is assigned to this conversation
        if (conversation.getRep() == null || !conversation.getRep().getId().equals(rep.getId())) {
            throw new AccessDeniedException("Not your conversation");
        }

        // Verify conversation is active
        if (conversation.getStatus() != ConversationStatus.ACTIVE) {
            throw new IllegalArgumentException("Conversation is not active");
        }

        String token = liveKitTokenService.generateToken(
                conversation.getLiveKitRoomName(),
                "rep_" + userId,
                rep.getUser().getUsername()
        );

        return ResponseEntity.ok(new TokenResponse(
                token,
                conversation.getLiveKitRoomName(),
                liveKitTokenService.getLiveKitUrl()
        ));
    }
}
