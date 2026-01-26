package com.notificationservice.service;

import com.notificationservice.dto.AcceptRequestResponse;
import com.notificationservice.dto.LiveConnectRequestDto;
import com.notificationservice.dto.LiveConnectVisitorDto;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.entity.RepAvailability;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.entity.RequestStatus;
import com.notificationservice.service.LiveKitTokenService;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.CallStartingEvent;
import com.notificationservice.websocket.event.ConversationStartedEvent;
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

    private final LiveConnectRequestRepository requestRepository;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectConversationRepository conversationRepository;
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

        return new AcceptRequestResponse(conversation.getId(), roomName, repToken);
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
