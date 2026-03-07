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
import com.notificationservice.entity.LiveConnectRequestDismissal;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.LiveConnectRequestDismissalRepository;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.CallStartedBroadcastEvent;
import com.notificationservice.websocket.event.CallStartingEvent;
import com.notificationservice.websocket.event.ConversationStartedEvent;
import com.notificationservice.websocket.event.RequestAcceptedByOtherEvent;
import com.notificationservice.websocket.event.RepAvailabilityChangedEvent;
import com.notificationservice.websocket.event.RepStatusChangedEvent;
import com.notificationservice.websocket.event.PingWithdrawnEvent;
import com.notificationservice.websocket.event.RequestCancelledEvent;
import com.notificationservice.websocket.event.RequestDismissedEvent;
import com.notificationservice.websocket.event.RequestReceivedEvent;
import com.notificationservice.websocket.session.VisitorSessionManager;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
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
    private final LiveConnectRequestDismissalRepository dismissalRepository;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectVisitorRepository visitorRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WebSocketBroadcaster broadcaster;
    private final LiveKitTokenService liveKitTokenService;
    private final PushNotificationService pushNotificationService;
    private final VisitorSessionManager visitorSessionManager;

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
        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        Set<UUID> dismissedRequestIds = dismissalRepository.findDismissedRequestIdsByRepId(rep.getId());

        return requestRepository.findPendingByProjectId(projectId).stream()
                .filter(r -> !dismissedRequestIds.contains(r.getId()))
                .map(this::toRequestDto)
                .toList();
    }

    /**
     * Accepts a request and creates a conversation.
     *
     * @param projectId the project ID
     * @param requestId the request ID
     * @param userId the requesting user's ID (must be a rep)
     * @param deviceSessionId the device session ID of the accepting client (null for backward compat)
     * @return accept response with conversation details
     * @throws ResourceNotFoundException if project, request not found, or user is not a rep
     * @throws IllegalArgumentException if project is not LIVECONNECT type, request is not pending,
     *                                   rep is not available, or rep already in a call
     */
    @Transactional
    public AcceptRequestResponse acceptRequest(UUID projectId, UUID requestId, UUID userId, String deviceSessionId) {
        getAndValidateProject(projectId, userId);
        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        // Use pessimistic lock to prevent two reps from accepting the same request
        LiveConnectRequest request = requestRepository.findByIdForUpdate(requestId)
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

        // Update visitor lastCallAt for CRM sort/filter
        LiveConnectVisitor visitor = request.getVisitor();
        visitor.setLastCallAt(OffsetDateTime.now());
        visitorRepository.save(visitor);

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

        // Broadcast rep status change to all reps in the project
        broadcastRepStatusChanged(rep, projectId);

        // Withdraw any pending pings this rep has to other visitors
        withdrawPendingPingsForRep(rep, projectId, null);

        // Update visitor engagement state to IN_CALL
        visitorSessionManager.setVisitorState(request.getVisitor().getId(), VisitorSessionManager.VisitorEngagementState.IN_CALL);

        // Broadcast rep availability change to visitors
        boolean hasAvailableReps = repRepository.hasAnyAvailableReps(projectId);
        RepAvailabilityChangedEvent availabilityEvent = new RepAvailabilityChangedEvent(hasAvailableReps);
        broadcaster.broadcastToProjectVisitors(projectId, availabilityEvent);

        // Generate LiveKit room name and tokens
        String roomName = liveKitTokenService.generateRoomName(conversation.getId());
        conversation.setLiveKitRoomName(roomName);
        conversationRepository.save(conversation);

        // Generate separate tokens for rep and visitor
        String repToken = liveKitTokenService.generateToken(
                roomName,
                "rep_" + rep.getUser().getId(),
                rep.getUser().getDisplayName()
        );
        String visitorToken = liveKitTokenService.generateToken(
                roomName,
                "visitor_" + request.getVisitor().getId(),
                request.getVisitor().getName() != null ? request.getVisitor().getName() : "Visitor"
        );

        // Broadcast to rep with rep's token (includes deviceSessionId so clients know which device accepted)
        ConversationStartedEvent repEvent = new ConversationStartedEvent(
                conversation.getId(),
                request.getVisitor().getId(),
                roomName,
                repToken,
                liveKitTokenService.getLiveKitUrl(),
                deviceSessionId,
                "accept"
        );
        broadcaster.sendToRep(rep.getUser().getId(), repEvent);

        // Broadcast to visitor with visitor's token
        CallStartingEvent visitorEvent = new CallStartingEvent(
                conversation.getId(),
                roomName,
                visitorToken
        );
        broadcaster.sendToVisitor(request.getVisitor().getId(), visitorEvent);

        // Broadcast call started to all reps in project
        CallStartedBroadcastEvent callStartedBroadcast = new CallStartedBroadcastEvent(
                conversation.getId(),
                request.getVisitor().getId(),
                request.getVisitor().getName(),
                rep.getId(),
                rep.getUser().getId(),
                rep.getUser().getDisplayName(),
                conversation.getStartedAt()
        );
        broadcaster.broadcastToProject(projectId, callStartedBroadcast);

        // Notify other reps that this request was accepted so they can remove it from their queue
        RequestAcceptedByOtherEvent acceptedEvent = new RequestAcceptedByOtherEvent(
                requestId,
                rep.getId(),
                rep.getUser().getDisplayName()
        );
        broadcaster.broadcastToProject(projectId, acceptedEvent);

        return new AcceptRequestResponse(
                conversation.getId(),
                request.getVisitor().getId(),
                roomName,
                repToken,
                liveKitTokenService.getLiveKitUrl()
        );
    }

    /**
     * Dismisses a request for a specific rep. The request stays PENDING so other
     * reps can still see and accept it. Only the dismissing rep loses visibility.
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

        // Idempotent: if already dismissed by this rep, return silently
        if (dismissalRepository.existsByRequestIdAndRepId(requestId, rep.getId())) {
            return;
        }

        // Record the per-rep dismissal — request stays PENDING for other reps
        LiveConnectRequestDismissal dismissal = LiveConnectRequestDismissal.builder()
                .request(request)
                .rep(rep)
                .build();
        dismissalRepository.save(dismissal);

        // Notify only the dismissing rep (not broadcast)
        RequestDismissedEvent event = new RequestDismissedEvent(requestId);
        broadcaster.sendToRep(userId, event);
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

        // Update visitor engagement state to WAITING
        visitorSessionManager.setVisitorState(visitor.getId(), VisitorSessionManager.VisitorEngagementState.WAITING);

        // Broadcast to all reps in the project
        RequestReceivedEvent event = new RequestReceivedEvent(
                request.getId(),
                visitor.getId(),
                visitor.getName(),
                RequestDirection.USER_TO_REPS.name(),
                request.getExpiresAt()
        );
        broadcaster.broadcastToProject(projectId, event);

        // Send push notification to reps who are offline
        pushNotificationService.sendVisitorRequestNotification(projectId, request);

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

        // Reject cancellation only for truly terminal states (already accepted or already cancelled)
        // Allow PENDING, EXPIRED (rep dismissed), and DECLINED through
        if (request.getStatus() == RequestStatus.ACCEPTED
                || request.getStatus() == RequestStatus.CANCELLED) {
            throw new IllegalArgumentException("Request is no longer pending");
        }

        request.setStatus(RequestStatus.CANCELLED);
        requestRepository.save(request);

        // Update visitor engagement state back to BROWSING
        visitorSessionManager.setVisitorState(visitorId, VisitorSessionManager.VisitorEngagementState.BROWSING);

        // Broadcast to reps so iOS app moves visitor from "waiting" to "browsing"
        RequestCancelledEvent event = new RequestCancelledEvent(requestId);
        broadcaster.broadcastToProject(request.getProject().getId(), event);
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

        // Verify rep is still online (not disconnected)
        if (rep.getPresence() == RepPresence.OFFLINE) {
            request.setStatus(RequestStatus.EXPIRED);
            requestRepository.save(request);
            throw new IllegalArgumentException("Rep is no longer available");
        }

        // Verify rep is not already in a call
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

        // Update visitor lastCallAt for CRM sort/filter
        LiveConnectVisitor pingVisitor = request.getVisitor();
        pingVisitor.setLastCallAt(OffsetDateTime.now());
        visitorRepository.save(pingVisitor);

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

        // Broadcast rep status change to all reps in the project
        UUID projectId = request.getProject().getId();
        broadcastRepStatusChanged(rep, projectId);

        // Withdraw any other pending pings this rep has (excluding the one being accepted)
        withdrawPendingPingsForRep(rep, projectId, requestId);

        // Update visitor engagement state to IN_CALL
        visitorSessionManager.setVisitorState(request.getVisitor().getId(), VisitorSessionManager.VisitorEngagementState.IN_CALL);

        // Broadcast rep availability change to visitors
        boolean hasAvailableReps = repRepository.hasAnyAvailableReps(projectId);
        RepAvailabilityChangedEvent availabilityEvent = new RepAvailabilityChangedEvent(hasAvailableReps);
        broadcaster.broadcastToProjectVisitors(projectId, availabilityEvent);

        // Generate LiveKit room name and tokens
        String roomName = liveKitTokenService.generateRoomName(conversation.getId());
        conversation.setLiveKitRoomName(roomName);
        conversationRepository.save(conversation);

        // Generate separate tokens for rep and visitor
        String repToken = liveKitTokenService.generateToken(
                roomName,
                "rep_" + rep.getUser().getId(),
                rep.getUser().getDisplayName()
        );
        String visitorToken = liveKitTokenService.generateToken(
                roomName,
                "visitor_" + request.getVisitor().getId(),
                request.getVisitor().getName() != null ? request.getVisitor().getName() : "Visitor"
        );

        // Broadcast to rep with rep's token (includes deviceSessionId from the ping so only the pinging device opens)
        ConversationStartedEvent repEvent = new ConversationStartedEvent(
                conversation.getId(),
                request.getVisitor().getId(),
                roomName,
                repToken,
                liveKitTokenService.getLiveKitUrl(),
                request.getDeviceSessionId(),
                "ping_accepted"
        );
        broadcaster.sendToRep(rep.getUser().getId(), repEvent);

        // Broadcast call started to all reps in project
        CallStartedBroadcastEvent callStartedBroadcast = new CallStartedBroadcastEvent(
                conversation.getId(),
                request.getVisitor().getId(),
                request.getVisitor().getName(),
                rep.getId(),
                rep.getUser().getId(),
                rep.getUser().getDisplayName(),
                conversation.getStartedAt()
        );
        broadcaster.broadcastToProject(projectId, callStartedBroadcast);

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

        // Update visitor engagement state back to BROWSING
        visitorSessionManager.setVisitorState(visitorId, VisitorSessionManager.VisitorEngagementState.BROWSING);

        // Set a cooldown on the visitor to prevent immediate re-pings
        LiveConnectVisitor visitor = request.getVisitor();
        visitor.setPingCooldownUntil(OffsetDateTime.now().plusSeconds(PING_COOLDOWN_SECONDS));
        visitorRepository.save(visitor);
    }

    /**
     * Withdraws all pending pings for a rep who has disconnected.
     * Called when a rep's last WebSocket connection closes.
     *
     * @param repId the rep's ID
     * @param projectId the project ID for broadcasting
     */
    @Transactional
    public void withdrawPendingPingsOnDisconnect(UUID repId, UUID projectId) {
        LiveConnectRep rep = repRepository.findById(repId).orElse(null);
        if (rep == null) return;
        withdrawPendingPingsForRep(rep, projectId, null);
    }

    /**
     * Withdraws all pending pings that were initiated from a specific device session.
     * Called when a device disconnects so visitors don't see stale pings from that device.
     *
     * @param deviceSessionId the device session ID that originated the pings
     * @param projectId the project ID for broadcasting
     */
    @Transactional
    public void withdrawPendingPingsByDeviceSession(String deviceSessionId, UUID projectId) {
        List<LiveConnectRequest> pendingPings = requestRepository.findPendingPingsByDeviceSessionId(deviceSessionId);

        for (LiveConnectRequest ping : pendingPings) {
            ping.setStatus(RequestStatus.CANCELLED);
            requestRepository.save(ping);

            // Reset visitor engagement back to BROWSING
            visitorSessionManager.setVisitorState(
                    ping.getVisitor().getId(),
                    VisitorSessionManager.VisitorEngagementState.BROWSING
            );

            // Notify the visitor their incoming ping was withdrawn
            PingWithdrawnEvent visitorEvent = new PingWithdrawnEvent(ping.getId());
            broadcaster.sendToVisitor(ping.getVisitor().getId(), visitorEvent);

            // Notify reps so the request is removed from their queue
            RequestCancelledEvent repEvent = new RequestCancelledEvent(ping.getId());
            broadcaster.broadcastToProject(projectId, repEvent);
        }
    }

    /**
     * Withdraws all pending pings by a rep, excluding the specified request.
     * Called when a rep enters a call so other visitors don't see stale incoming pings.
     *
     * @param rep the rep entering a call
     * @param projectId the project ID for broadcasting
     * @param excludeRequestId request ID to skip (the ping being accepted), or null
     */
    private void withdrawPendingPingsForRep(LiveConnectRep rep, UUID projectId, UUID excludeRequestId) {
        List<LiveConnectRequest> pendingPings = requestRepository.findPendingPingsByRepId(rep.getId());

        for (LiveConnectRequest ping : pendingPings) {
            if (excludeRequestId != null && ping.getId().equals(excludeRequestId)) {
                continue;
            }

            // Cancel the ping
            ping.setStatus(RequestStatus.CANCELLED);
            requestRepository.save(ping);

            // Reset visitor engagement back to BROWSING
            visitorSessionManager.setVisitorState(
                    ping.getVisitor().getId(),
                    VisitorSessionManager.VisitorEngagementState.BROWSING
            );

            // Notify the visitor their incoming ping was withdrawn
            PingWithdrawnEvent visitorEvent = new PingWithdrawnEvent(ping.getId());
            broadcaster.sendToVisitor(ping.getVisitor().getId(), visitorEvent);

            // Notify reps so the request is removed from their queue
            RequestCancelledEvent repEvent = new RequestCancelledEvent(ping.getId());
            broadcaster.broadcastToProject(projectId, repEvent);
        }
    }

    private void broadcastRepStatusChanged(LiveConnectRep rep, UUID projectId) {
        RepStatusChangedEvent event = new RepStatusChangedEvent(
                rep.getId(),
                rep.getUser().getId(),
                rep.getUser().getDisplayName(),
                rep.getUser().getEmail(),
                rep.getAvailability().name(),
                rep.getPresence().name()
        );
        broadcaster.broadcastToProject(projectId, event);
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

        // Compute isConnected from activeConnections
        boolean isConnected = visitor.getActiveConnections() != null
                && visitor.getActiveConnections() > 0;

        // Compute isPingable: connected AND not in cooldown
        boolean isPingable = isConnected && (
                visitor.getPingCooldownUntil() == null
                || visitor.getPingCooldownUntil().isBefore(OffsetDateTime.now())
        );

        return new LiveConnectVisitorDto(
                visitor.getId(),
                visitor.getVisitorId(),
                visitor.getName(),
                visitor.getEmail(),
                currentPage,
                visitor.getLastSeenAt(),
                true,
                isConnected,
                isPingable,
                false,
                null,
                0,
                visitor.getCountryCode(),
                visitor.getCountry(),
                visitor.getCity(),
                visitor.getBrowserName(),
                visitor.getOsName(),
                visitor.getDeviceType()
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
