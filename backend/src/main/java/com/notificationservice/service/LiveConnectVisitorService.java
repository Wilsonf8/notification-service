package com.notificationservice.service;

import com.notificationservice.dto.ActiveCallDto;
import com.notificationservice.dto.LiveConnectRequestDto;
import com.notificationservice.dto.LiveConnectVisitorDto;
import com.notificationservice.dto.PingVisitorResponse;
import com.notificationservice.dto.VisitorListResponse;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.entity.RequestDirection;
import com.notificationservice.entity.RequestStatus;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.IncomingPingEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing LiveConnect visitors.
 */
@Service
@RequiredArgsConstructor
public class LiveConnectVisitorService {

    private static final int ONLINE_THRESHOLD_MINUTES = 2;
    private static final int REQUEST_EXPIRY_MINUTES = 2;

    private final LiveConnectVisitorRepository visitorRepository;
    private final LiveConnectRequestRepository requestRepository;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectConversationRepository conversationRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WebSocketBroadcaster broadcaster;

    /**
     * Gets visitors for the dashboard, split into browsing and queue.
     *
     * @param projectId the project ID
     * @param userId the requesting user's ID (must be a rep)
     * @return visitor list response with browsing and queue sections
     * @throws ResourceNotFoundException if project not found or user is not a rep
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     */
    @Transactional(readOnly = true)
    public VisitorListResponse getVisitors(UUID projectId, UUID userId) {
        getAndValidateProject(projectId, userId);
        verifyRepAccess(projectId, userId);

        OffsetDateTime threshold = OffsetDateTime.now().minusMinutes(ONLINE_THRESHOLD_MINUTES);
        List<LiveConnectVisitor> onlineVisitors = visitorRepository.findOnlineByProjectId(projectId, threshold);

        // Get pending requests for the queue
        List<LiveConnectRequest> pendingRequests = requestRepository.findPendingByProjectId(projectId);
        Set<UUID> visitorIdsWithRequests = pendingRequests.stream()
                .map(r -> r.getVisitor().getId())
                .collect(Collectors.toSet());

        // Get active calls
        List<LiveConnectConversation> activeConversations = conversationRepository.findActiveByProjectId(projectId);
        Set<UUID> visitorIdsInCall = activeConversations.stream()
                .map(c -> c.getVisitor().getId())
                .collect(Collectors.toSet());

        // Browsing: online visitors without active requests and not in a call
        List<LiveConnectVisitorDto> browsing = onlineVisitors.stream()
                .filter(v -> !visitorIdsWithRequests.contains(v.getId()))
                .filter(v -> !visitorIdsInCall.contains(v.getId()))
                .map(v -> toVisitorDto(v, false))
                .toList();

        // Queue: pending requests
        List<LiveConnectRequestDto> queue = pendingRequests.stream()
                .map(this::toRequestDto)
                .toList();

        // In call: active conversations
        List<ActiveCallDto> inCall = activeConversations.stream()
                .map(this::toActiveCallDto)
                .toList();

        return new VisitorListResponse(browsing, queue, inCall);
    }

    /**
     * Pings a visitor (rep initiates a request to connect).
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param userId the requesting user's ID (must be a rep)
     * @return ping response with request ID and expiry
     * @throws ResourceNotFoundException if project, visitor not found, or user is not a rep
     * @throws IllegalArgumentException if project is not LIVECONNECT type, visitor is offline, or has pending request
     */
    @Transactional
    public PingVisitorResponse pingVisitor(UUID projectId, UUID visitorId, UUID userId) {
        getAndValidateProject(projectId, userId);
        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));

        // Verify visitor belongs to this project
        if (!visitor.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Visitor not found");
        }

        // Check if visitor is online
        OffsetDateTime threshold = OffsetDateTime.now().minusMinutes(ONLINE_THRESHOLD_MINUTES);
        if (visitor.getLastSeenAt() == null || visitor.getLastSeenAt().isBefore(threshold)) {
            throw new IllegalArgumentException("Visitor is offline");
        }

        // Check if visitor has a pending request already
        if (requestRepository.findPendingByVisitorId(visitor.getId()).isPresent()) {
            throw new IllegalArgumentException("Visitor already has a pending request");
        }

        // Check ping cooldown
        if (visitor.getPingCooldownUntil() != null && visitor.getPingCooldownUntil().isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Visitor is in ping cooldown");
        }

        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(REQUEST_EXPIRY_MINUTES);

        LiveConnectRequest request = LiveConnectRequest.builder()
                .project(visitor.getProject())
                .visitor(visitor)
                .initiatedByRep(rep)
                .direction(RequestDirection.REP_TO_USER)
                .expiresAt(expiresAt)
                .build();

        request = requestRepository.save(request);

        // Broadcast ping to visitor
        IncomingPingEvent event = new IncomingPingEvent(
                request.getId(),
                rep.getUser().getUsername(),
                expiresAt
        );
        broadcaster.sendToVisitor(visitor.getId(), event);

        return new PingVisitorResponse(request.getId(), expiresAt);
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

    private LiveConnectVisitorDto toVisitorDto(LiveConnectVisitor visitor, boolean hasActiveRequest) {
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
                hasActiveRequest,
                isConnected,
                isPingable
        );
    }

    private LiveConnectRequestDto toRequestDto(LiveConnectRequest request) {
        LiveConnectVisitor visitor = request.getVisitor();
        return new LiveConnectRequestDto(
                request.getId(),
                toVisitorDto(visitor, true),
                request.getDirection().name(),
                request.getStatus().name(),
                request.getExpiresAt(),
                request.getCreatedAt()
        );
    }

    private ActiveCallDto toActiveCallDto(LiveConnectConversation conversation) {
        LiveConnectVisitor visitor = conversation.getVisitor();
        LiveConnectRep rep = conversation.getRep();
        return new ActiveCallDto(
                conversation.getId(),
                visitor.getId(),
                visitor.getName(),
                rep.getId(),
                rep.getUser().getId(),
                rep.getUser().getUsername(),
                conversation.getStartedAt()
        );
    }
}
