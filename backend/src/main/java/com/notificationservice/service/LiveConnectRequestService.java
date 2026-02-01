package com.notificationservice.service;

import com.notificationservice.dto.AcceptPingResponse;
import com.notificationservice.dto.AcceptRequestResponse;
import com.notificationservice.dto.LiveConnectRequestDto;
import com.notificationservice.dto.LiveConnectVisitorDto;
import com.notificationservice.dto.RequestResponse;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.entity.RepAvailability;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.entity.RequestDirection;
import com.notificationservice.entity.RequestStatus;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.CallStartingEvent;
import com.notificationservice.websocket.event.ConversationStartedEvent;
import com.notificationservice.websocket.event.RequestReceivedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing LiveConnect requests.
 */
@Service
@RequiredArgsConstructor
public class LiveConnectRequestService {

    private static final int REQUEST_EXPIRY_SECONDS = 30;
    private static final int PING_COOLDOWN_SECONDS = 30;

    private final LiveConnectRequestRepository requestRepository;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectVisitorRepository visitorRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WebSocketBroadcaster broadcaster;
    private final LiveKitTokenService liveKitTokenService;

    /**
     * Gets pending requests for a project.
     *
     * @param projectId the project ID
     * @param userId the requesting user's ID (must be a rep)
     * @return list of pending request DTOs
     * @throws ResourceNotFoundException if project not found or user is not a rep
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     */
    @Transactional(readOnly = true)
    public List<LiveConnectRequestDto> getPendingRequests(UUID projectId, UUID userId) {
        getAndValidateProject(projectId, userId);
        verifyRepAccess(projectId, userId);

        return requestRepository.findPendingByProjectId(projectId).stream()
                .map(this::toRequestDto)
                .toList();
    }

    /**
     * Accepts a request and creates a conversation.
     *
     * @param projectId the project ID
     * @param requestId the request ID
     * @param userId the requesting user's ID (must be a rep)
     * @return accept response with conversation details
     * @throws ResourceNotFoundException if project, request not found, or user is not a rep
     * @throws IllegalArgumentException if project is not LIVECONNECT type, request is not pending,
     *                                   rep is not available, or rep already in a call
     */
    @Transactional
    public AcceptRequestResponse acceptRequest(UUID projectId, UUID requestId, UUID userId) {
        getAndValidateProject(projectId, userId);
        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        LiveConnectRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        // Verify request belongs to this project
        if (!request.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Request not found");
        }

        // Verify request is still pending
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("Request is no longer pending");
        }

        // Check if request has expired
        if (request.getExpiresAt().isBefore(OffsetDateTime.now())) {
            request.setStatus(RequestStatus.EXPIRED);
            requestRepository.save(request);
            throw new IllegalArgumentException("Request has expired");
        }

        // Verify rep is available
        if (rep.getAvailability() != RepAvailability.AVAILABLE) {
            throw new IllegalArgumentException("You must set your availability to 'available' before accepting requests");
        }

        // Verify rep is not already in a call
        if (rep.getCurrentConversation() != null) {
            throw new IllegalArgumentException("You are already in a call");
        }

        // Create the conversation
        LiveConnectConversation conversation = LiveConnectConversation.builder()
                .project(request.getProject())
                .visitor(request.getVisitor())
                .rep(rep)
                .build();
        conversation = conversationRepository.save(conversation);

        // Update the request
        request.setStatus(RequestStatus.ACCEPTED);
        request.setAcceptedByRep(rep);
        request.setAcceptedAt(OffsetDateTime.now());
        request.setConversation(conversation);
        requestRepository.save(request);

        // Update the rep
        rep.setCurrentConversation(conversation);
        rep.setPresence(RepPresence.IN_CALL);
        rep.setCallStartedAt(OffsetDateTime.now());
        repRepository.save(rep);

        // Generate LiveKit room name and tokens
        String roomName = liveKitTokenService.generateRoomName(conversation.getId());
        conversation.setLiveKitRoomName(roomName);
        conversationRepository.save(conversation);

        // Generate separate tokens for rep and visitor
        String repToken = liveKitTokenService.generateToken(
                roomName,
                "rep_" + rep.getUser().getId(),
                rep.getUser().getUsername()
        );
        String visitorToken = liveKitTokenService.generateToken(
                roomName,
                "visitor_" + request.getVisitor().getId(),
                request.getVisitor().getName() != null ? request.getVisitor().getName() : "Visitor"
        );

        // Broadcast to rep with rep's token
        ConversationStartedEvent repEvent = new ConversationStartedEvent(
                conversation.getId(),
                request.getVisitor().getId(),
                roomName,
                repToken
        );
        broadcaster.sendToRep(rep.getUser().getId(), repEvent);

        // Broadcast to visitor with visitor's token
        CallStartingEvent visitorEvent = new CallStartingEvent(
                conversation.getId(),
                roomName,
                visitorToken
        );
        broadcaster.sendToVisitor(request.getVisitor().getId(), visitorEvent);

        return new AcceptRequestResponse(
                conversation.getId(),
                roomName,
                repToken,
                liveKitTokenService.getLiveKitUrl()
        );
    }

    /**
     * Dismisses a request (expires it for now).
     *
     * @param projectId the project ID
     * @param requestId the request ID
     * @param userId the requesting user's ID (must be a rep)
     * @throws ResourceNotFoundException if project, request not found, or user is not a rep
     * @throws IllegalArgumentException if project is not LIVECONNECT type or request is not pending
     */
    @Transactional
    public void dismissRequest(UUID projectId, UUID requestId, UUID userId) {
        getAndValidateProject(projectId, userId);
        verifyRepAccess(projectId, userId);

        LiveConnectRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        // Verify request belongs to this project
        if (!request.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Request not found");
        }

        // Verify request is still pending
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("Request is no longer pending");
        }

        // For now, dismissing just expires the request
        // In the future, this could be per-rep dismissal tracking
        request.setStatus(RequestStatus.EXPIRED);
        requestRepository.save(request);
    }

    // ==================== Visitor-facing methods ====================

    /**
     * Creates a request from a visitor to talk with any available rep.
     *
     * @param projectId the project ID
     * @param visitor the visitor creating the request
     * @return response with request ID and expiration time
     * @throws IllegalStateException if visitor already has a pending request
     */
    @Transactional
    public RequestResponse createVisitorRequest(UUID projectId, LiveConnectVisitor visitor) {
        // Check if visitor already has a pending request
        requestRepository.findPendingByVisitorId(visitor.getId())
                .ifPresent(existing -> {
                    throw new IllegalStateException("You already have a pending request");
                });

        // Create the request
        LiveConnectRequest request = LiveConnectRequest.builder()
                .project(visitor.getProject())
                .visitor(visitor)
                .direction(RequestDirection.USER_TO_REPS)
                .status(RequestStatus.PENDING)
                .expiresAt(OffsetDateTime.now().plusSeconds(REQUEST_EXPIRY_SECONDS))
                .build();
        request = requestRepository.save(request);

        // Broadcast to all reps in the project
        RequestReceivedEvent event = new RequestReceivedEvent(
                request.getId(),
                visitor.getId(),
                visitor.getName(),
                RequestDirection.USER_TO_REPS.name(),
                request.getExpiresAt()
        );
        broadcaster.broadcastToProject(projectId, event);

        return new RequestResponse(request.getId(), request.getExpiresAt());
    }

    /**
     * Cancels a visitor's pending request.
     *
     * @param requestId the request ID to cancel
     * @param visitorId the visitor's internal ID
     * @throws ResourceNotFoundException if request not found
     * @throws AccessDeniedException if visitor doesn't own the request
     * @throws IllegalArgumentException if request is not pending
     */
    @Transactional
    public void cancelRequest(UUID requestId, UUID visitorId) {
        LiveConnectRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        // Verify visitor owns this request
        if (!request.getVisitor().getId().equals(visitorId)) {
            throw new AccessDeniedException("You do not own this request");
        }

        // Verify request is still pending
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("Request is no longer pending");
        }

        request.setStatus(RequestStatus.CANCELLED);
        requestRepository.save(request);
    }

    /**
     * Visitor accepts a rep's ping (REP_TO_USER request).
     * Creates a conversation and returns connection details.
     *
     * @param requestId the ping request ID
     * @param visitorId the visitor's internal ID
     * @return response with conversation details and LiveKit tokens
     * @throws ResourceNotFoundException if request not found
     * @throws AccessDeniedException if visitor doesn't own the request
     * @throws IllegalArgumentException if request is not a rep-to-user ping or not pending
     */
    @Transactional
    public AcceptPingResponse visitorAcceptsPing(UUID requestId, UUID visitorId) {
        LiveConnectRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        // Verify visitor owns this request
        if (!request.getVisitor().getId().equals(visitorId)) {
            throw new AccessDeniedException("You do not own this request");
        }

        // Verify this is a rep-to-user ping
        if (request.getDirection() != RequestDirection.REP_TO_USER) {
            throw new IllegalArgumentException("This is not an incoming ping");
        }

        // Verify request is still pending
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("Request is no longer pending");
        }

        // Check if request has expired
        if (request.getExpiresAt().isBefore(OffsetDateTime.now())) {
            request.setStatus(RequestStatus.EXPIRED);
            requestRepository.save(request);
            throw new IllegalArgumentException("Request has expired");
        }

        LiveConnectRep rep = request.getInitiatedByRep();
        if (rep == null) {
            throw new IllegalStateException("Ping has no associated rep");
        }

        // Verify rep is still available
        if (rep.getCurrentConversation() != null) {
            request.setStatus(RequestStatus.EXPIRED);
            requestRepository.save(request);
            throw new IllegalArgumentException("Rep is no longer available");
        }

        // Create the conversation
        LiveConnectConversation conversation = LiveConnectConversation.builder()
                .project(request.getProject())
                .visitor(request.getVisitor())
                .rep(rep)
                .build();
        conversation = conversationRepository.save(conversation);

        // Update the request
        request.setStatus(RequestStatus.ACCEPTED);
        request.setAcceptedByRep(rep);
        request.setAcceptedAt(OffsetDateTime.now());
        request.setConversation(conversation);
        requestRepository.save(request);

        // Update the rep
        rep.setCurrentConversation(conversation);
        rep.setPresence(RepPresence.IN_CALL);
        rep.setCallStartedAt(OffsetDateTime.now());
        repRepository.save(rep);

        // Generate LiveKit room name and tokens
        String roomName = liveKitTokenService.generateRoomName(conversation.getId());
        conversation.setLiveKitRoomName(roomName);
        conversationRepository.save(conversation);

        // Generate separate tokens for rep and visitor
        String repToken = liveKitTokenService.generateToken(
                roomName,
                "rep_" + rep.getUser().getId(),
                rep.getUser().getUsername()
        );
        String visitorToken = liveKitTokenService.generateToken(
                roomName,
                "visitor_" + request.getVisitor().getId(),
                request.getVisitor().getName() != null ? request.getVisitor().getName() : "Visitor"
        );

        // Broadcast to rep with rep's token
        ConversationStartedEvent repEvent = new ConversationStartedEvent(
                conversation.getId(),
                request.getVisitor().getId(),
                roomName,
                repToken
        );
        broadcaster.sendToRep(rep.getUser().getId(), repEvent);

        return new AcceptPingResponse(
                conversation.getId(),
                roomName,
                visitorToken,
                liveKitTokenService.getLiveKitUrl()
        );
    }

    /**
     * Visitor declines a rep's ping.
     * Sets a cooldown on the visitor to prevent immediate re-pings.
     *
     * @param requestId the ping request ID
     * @param visitorId the visitor's internal ID
     * @throws ResourceNotFoundException if request not found
     * @throws AccessDeniedException if visitor doesn't own the request
     * @throws IllegalArgumentException if request is not a rep-to-user ping or not pending
     */
    @Transactional
    public void visitorDeclinesPing(UUID requestId, UUID visitorId) {
        LiveConnectRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        // Verify visitor owns this request
        if (!request.getVisitor().getId().equals(visitorId)) {
            throw new AccessDeniedException("You do not own this request");
        }

        // Verify this is a rep-to-user ping
        if (request.getDirection() != RequestDirection.REP_TO_USER) {
            throw new IllegalArgumentException("This is not an incoming ping");
        }

        // Verify request is still pending (allow declining already-expired for cleanup)
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("Request is no longer pending");
        }

        request.setStatus(RequestStatus.DECLINED);
        requestRepository.save(request);

        // Set a cooldown on the visitor to prevent immediate re-pings
        LiveConnectVisitor visitor = request.getVisitor();
        visitor.setPingCooldownUntil(OffsetDateTime.now().plusSeconds(PING_COOLDOWN_SECONDS));
        visitorRepository.save(visitor);
    }

    private Project getAndValidateProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (project.getType() != ProjectType.LIVECONNECT) {
            throw new IllegalArgumentException("Project is not a LiveConnect project");
        }

        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(
                project.getOrganization().getId(), userId);
        if (!isMember) {
            throw new AccessDeniedException("You are not a member of this organization");
        }

        return project;
    }

    private LiveConnectRep verifyRepAccess(UUID projectId, UUID userId) {
        return repRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("You are not a rep for this project"));
    }

    private LiveConnectVisitorDto toVisitorDto(LiveConnectVisitor visitor) {
        String currentPage = null;
        if (visitor.getMetadata() != null) {
            Object page = visitor.getMetadata().get("currentPage");
            if (page != null) {
                currentPage = page.toString();
            }
        }

        return new LiveConnectVisitorDto(
                visitor.getId(),
                visitor.getVisitorId(),
                visitor.getName(),
                visitor.getEmail(),
                currentPage,
                visitor.getLastSeenAt(),
                true
        );
    }

    private LiveConnectRequestDto toRequestDto(LiveConnectRequest request) {
        return new LiveConnectRequestDto(
                request.getId(),
                toVisitorDto(request.getVisitor()),
                request.getDirection().name(),
                request.getStatus().name(),
                request.getExpiresAt(),
                request.getCreatedAt()
        );
    }
}
