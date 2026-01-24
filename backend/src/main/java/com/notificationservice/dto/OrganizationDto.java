package com.notificationservice.dto;

import com.notificationservice.entity.OrgRole;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO representing an organization with the user's role.
 *
 * @param id the unique identifier of the organization
 * @param name the display name of the organization
 * @param slug the URL-friendly identifier
 * @param isPersonal whether this is a personal organization
 * @param userRole the current user's role in this organization
 * @param createdAt when the organization was created
 */
public record OrganizationDto(
        UUID id,
        String name,
        String slug,
        Boolean isPersonal,
        OrgRole userRole,
        OffsetDateTime createdAt
) {}
