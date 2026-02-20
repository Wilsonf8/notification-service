package com.notificationservice.service;

import com.notificationservice.dto.NotificationPreferencesDto;
import com.notificationservice.dto.UpdateNotificationPreferencesRequest;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.entity.RepNotificationPreference;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.repository.RepNotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for managing notification preferences.
 */
@Service
@RequiredArgsConstructor
public class NotificationPreferencesService {

    private final RepNotificationPreferenceRepository preferenceRepository;
    private final LiveConnectRepRepository repRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    /**
     * Gets notification preferences for a rep.
     * Creates default preferences if none exist.
     *
     * @param projectId the project ID
     * @param userId the user ID
     * @return the notification preferences
     */
    @Transactional
    public NotificationPreferencesDto getPreferences(UUID projectId, UUID userId) {
        getAndValidateProject(projectId, userId);
        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        RepNotificationPreference pref = preferenceRepository.findByRepId(rep.getId())
                .orElseGet(() -> createDefaultPreferences(rep));

        return new NotificationPreferencesDto(
                pref.getNotifyVisitorPresence(),
                pref.getNotifyVisitorRequest(),
                pref.getNotifyContactForm()
        );
    }

    /**
     * Updates notification preferences for a rep.
     *
     * @param projectId the project ID
     * @param userId the user ID
     * @param request the update request
     * @return the updated preferences
     */
    @Transactional
    public NotificationPreferencesDto updatePreferences(UUID projectId, UUID userId, UpdateNotificationPreferencesRequest request) {
        getAndValidateProject(projectId, userId);
        LiveConnectRep rep = verifyRepAccess(projectId, userId);

        RepNotificationPreference pref = preferenceRepository.findByRepId(rep.getId())
                .orElseGet(() -> createDefaultPreferences(rep));

        if (request.notifyVisitorPresence() != null) {
            pref.setNotifyVisitorPresence(request.notifyVisitorPresence());
        }
        if (request.notifyVisitorRequest() != null) {
            pref.setNotifyVisitorRequest(request.notifyVisitorRequest());
        }
        if (request.notifyContactForm() != null) {
            pref.setNotifyContactForm(request.notifyContactForm());
        }

        pref = preferenceRepository.save(pref);

        return new NotificationPreferencesDto(
                pref.getNotifyVisitorPresence(),
                pref.getNotifyVisitorRequest(),
                pref.getNotifyContactForm()
        );
    }

    private RepNotificationPreference createDefaultPreferences(LiveConnectRep rep) {
        RepNotificationPreference pref = RepNotificationPreference.builder()
                .rep(rep)
                .notifyVisitorPresence(true)
                .notifyVisitorRequest(true)
                .notifyContactForm(true)
                .build();
        return preferenceRepository.save(pref);
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
}
