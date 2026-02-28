package com.notificationservice.service;

import com.notificationservice.dto.AddRepRequest;
import com.notificationservice.dto.LiveConnectRepDto;
import com.notificationservice.dto.UpdateAvailabilityRequest;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.entity.RepAvailability;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.entity.User;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.repository.UserRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.RepAvailabilityChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing LiveConnect reps.
 */
@Service
@RequiredArgsConstructor
public class LiveConnectRepService {

    private final LiveConnectRepRepository repRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final WebSocketBroadcaster broadcaster;
    private final TierService tierService;
    private final LiveConnectRequestService requestService;

    /**
     * Gets all reps for a project.
     *
     * @param projectId the project ID
     * @param userId the requesting user's ID
     * @return list of rep DTOs
     * @throws ResourceNotFoundException if project not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional(readOnly = true)
    public List<LiveConnectRepDto> getReps(UUID projectId, UUID userId) {
        getAndValidateProject(projectId, userId);

        return repRepository.findByProjectId(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Adds a user as a rep to a project.
     *
     * @param projectId the project ID
     * @param request the add rep request
     * @param userId the requesting user's ID
     * @return the created rep DTO
     * @throws ResourceNotFoundException if project or user not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type or user is already a rep
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional
    public LiveConnectRepDto addRep(UUID projectId, AddRepRequest request, UUID userId) {
        Project project = getAndValidateProject(projectId, userId);
        tierService.enforceOrgActive(project.getOrganization());
        tierService.enforceRepLimit(project.getOrganization(), projectId);

        User userToAdd = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if user is already a rep for this project
        if (repRepository.findByProjectIdAndUserId(projectId, request.userId()).isPresent()) {
            throw new IllegalArgumentException("User is already a rep for this project");
        }

        // Verify the user to add is a member of the organization
        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(
                project.getOrganization().getId(), request.userId());
        if (!isMember) {
            throw new IllegalArgumentException("User must be a member of the organization to be added as a rep");
        }

        LiveConnectRep rep = LiveConnectRep.builder()
                .project(project)
                .user(userToAdd)
                .build();

        return toDto(repRepository.save(rep));
    }

    /**
     * Removes a rep from a project.
     *
     * @param projectId the project ID
     * @param repUserId the user ID of the rep to remove
     * @param userId the requesting user's ID
     * @throws ResourceNotFoundException if project or rep not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional
    public void removeRep(UUID projectId, UUID repUserId, UUID userId) {
        getAndValidateProject(projectId, userId);

        LiveConnectRep rep = repRepository.findByProjectIdAndUserId(projectId, repUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Rep not found"));

        repRepository.delete(rep);
    }

    /**
     * Updates the calling user's availability for a project.
     *
     * @param projectId the project ID
     * @param request the update availability request
     * @param userId the requesting user's ID (must be a rep)
     * @return the updated rep DTO
     * @throws ResourceNotFoundException if project not found or user is not a rep
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     */
    @Transactional
    public LiveConnectRepDto updateAvailability(UUID projectId, UpdateAvailabilityRequest request, UUID userId) {
        projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        RepAvailability availability = "available".equalsIgnoreCase(request.availability())
                ? RepAvailability.AVAILABLE
                : RepAvailability.UNAVAILABLE;

        rep.setAvailability(availability);
        LiveConnectRep savedRep = repRepository.save(rep);

        // Broadcast availability change to all visitors in the project
        boolean hasAvailableReps = repRepository.hasAnyAvailableReps(projectId);
        RepAvailabilityChangedEvent event = new RepAvailabilityChangedEvent(hasAvailableReps);
        broadcaster.broadcastToProjectVisitors(projectId, event);

        return toDto(savedRep);
    }

    /**
     * Resets a rep's state, clearing any stuck conversation and setting presence to ONLINE.
     * Useful for recovering from failed calls during testing.
     *
     * @param projectId the project ID
     * @param userId the user ID
     * @return the updated rep DTO
     * @throws ResourceNotFoundException if project not found or user is not a rep
     */
    @Transactional
    public LiveConnectRepDto resetRepState(UUID projectId, UUID userId) {
        projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        // Clear any stuck conversation
        rep.setCurrentConversation(null);
        rep.setPresence(RepPresence.ONLINE);
        rep.setCallStartedAt(null);

        LiveConnectRep savedRep = repRepository.save(rep);
        return toDto(savedRep);
    }

    /**
     * Disconnects a rep from a project, setting them offline and withdrawing pending pings.
     * Used by the HTTP disconnect endpoint for reliable cleanup during page unload.
     * Skips reps that are currently in a call to avoid disrupting active conversations.
     *
     * @param projectId the project ID
     * @param userId the user ID of the rep to disconnect
     */
    @Transactional
    public void disconnectRep(UUID projectId, UUID userId) {
        repRepository.findByProjectIdAndUserId(projectId, userId).ifPresent(rep -> {
            if (rep.getPresence() == RepPresence.IN_CALL) return;
            rep.setPresence(RepPresence.OFFLINE);
            rep.setActiveConnections(0);
            repRepository.save(rep);
            requestService.withdrawPendingPingsOnDisconnect(rep.getId(), projectId);
        });
    }

    /**
     * Verifies that a user is a rep for a project.
     *
     * @param projectId the project ID
     * @param userId the user ID
     * @return the rep entity
     * @throws ResourceNotFoundException if user is not a rep for this project
     */
    public LiveConnectRep verifyRepAccess(UUID projectId, UUID userId) {
        return repRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("You are not a rep for this project"));
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

    private LiveConnectRepDto toDto(LiveConnectRep rep) {
        User user = rep.getUser();
        return new LiveConnectRepDto(
                rep.getId(),
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                rep.getAvailability().name(),
                rep.getPresence().name(),
                rep.getCreatedAt()
        );
    }
}
