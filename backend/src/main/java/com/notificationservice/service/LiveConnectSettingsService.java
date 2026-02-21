package com.notificationservice.service;

import com.notificationservice.dto.LiveConnectSettingsDto;
import com.notificationservice.dto.UpdateLiveConnectSettingsRequest;
import com.notificationservice.entity.LiveConnectSettings;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.repository.LiveConnectSettingsRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for managing LiveConnect project settings.
 */
@Service
@RequiredArgsConstructor
public class LiveConnectSettingsService {

    private final LiveConnectSettingsRepository settingsRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final TierService tierService;

    /**
     * Gets LiveConnect settings for a project. Creates default settings if none exist.
     *
     * @param projectId the project ID
     * @param userId the requesting user's ID
     * @return the settings DTO
     * @throws ResourceNotFoundException if project not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional
    public LiveConnectSettingsDto getSettings(UUID projectId, UUID userId) {
        Project project = getAndValidateProject(projectId, userId);

        LiveConnectSettings settings = settingsRepository.findByProjectId(projectId)
                .orElseGet(() -> createDefaultSettings(project));

        return toDto(settings);
    }

    /**
     * Updates LiveConnect settings for a project.
     *
     * @param projectId the project ID
     * @param request the update request
     * @param userId the requesting user's ID
     * @return the updated settings DTO
     * @throws ResourceNotFoundException if project not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional
    public LiveConnectSettingsDto updateSettings(UUID projectId, UpdateLiveConnectSettingsRequest request, UUID userId) {
        Project project = getAndValidateProject(projectId, userId);
        tierService.enforceWidgetCustomization(project.getOrganization());

        LiveConnectSettings settings = settingsRepository.findByProjectId(projectId)
                .orElseGet(() -> createDefaultSettings(project));

        if (request.welcomeMessage() != null) {
            settings.setWelcomeMessage(request.welcomeMessage());
        }
        if (request.offlineMessage() != null) {
            settings.setOfflineMessage(request.offlineMessage());
        }
        if (request.widgetColor() != null) {
            settings.setWidgetColor(request.widgetColor());
        }
        if (request.widgetPosition() != null) {
            settings.setWidgetPosition(request.widgetPosition());
        }
        if (request.isActive() != null) {
            settings.setIsActive(request.isActive());
        }
        if (request.backgroundColor() != null) {
            settings.setBackgroundColor(request.backgroundColor());
        }
        if (request.textColor() != null) {
            settings.setTextColor(request.textColor());
        }
        if (request.borderRadius() != null) {
            settings.setBorderRadius(request.borderRadius());
        }
        if (request.fontFamily() != null) {
            settings.setFontFamily(request.fontFamily());
        }
        if (request.widgetIcon() != null) {
            settings.setWidgetIcon(request.widgetIcon());
        }

        return toDto(settingsRepository.save(settings));
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

    private LiveConnectSettings createDefaultSettings(Project project) {
        LiveConnectSettings settings = LiveConnectSettings.builder()
                .project(project)
                .build();
        return settingsRepository.save(settings);
    }

    private LiveConnectSettingsDto toDto(LiveConnectSettings settings) {
        return new LiveConnectSettingsDto(
                settings.getWelcomeMessage(),
                settings.getOfflineMessage(),
                settings.getWidgetColor(),
                settings.getWidgetPosition(),
                settings.getIsActive(),
                settings.getBackgroundColor(),
                settings.getTextColor(),
                settings.getBorderRadius(),
                settings.getFontFamily(),
                settings.getWidgetIcon()
        );
    }
}
