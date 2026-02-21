package com.notificationservice.dto;

/**
 * DTO containing tier information and usage limits for an organization.
 *
 * @param tier the tier name ("FREE" or "PRO")
 * @param maxProjects maximum allowed projects
 * @param currentProjects current number of active projects
 * @param maxMembers maximum allowed members
 * @param currentMembers current number of members
 * @param maxRepsPerProject maximum reps per project
 * @param maxEmbedKeysPerProject maximum embed keys per project
 * @param widgetCustomizationEnabled whether widget customization is allowed
 * @param invitationsEnabled whether invitations are allowed
 * @param orgActive whether the organization is active
 */
public record TierLimitsDto(
        String tier,
        int maxProjects,
        long currentProjects,
        int maxMembers,
        long currentMembers,
        int maxRepsPerProject,
        int maxEmbedKeysPerProject,
        boolean widgetCustomizationEnabled,
        boolean invitationsEnabled,
        boolean orgActive
) {}
