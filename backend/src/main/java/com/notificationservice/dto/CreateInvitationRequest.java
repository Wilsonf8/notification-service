package com.notificationservice.dto;

import com.notificationservice.entity.OrgRole;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request DTO for creating an organization invitation.
 *
 * @param userId the ID of the user to invite
 * @param role the role to assign (ADMIN or MEMBER, not OWNER)
 */
public record CreateInvitationRequest(
        @NotNull(message = "User ID is required")
        UUID userId,

        @NotNull(message = "Role is required")
        OrgRole role
) {}
