package com.notificationservice.dto;

import com.notificationservice.entity.OrgRole;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for updating a member's role in an organization.
 *
 * @param role the new role to assign (ADMIN or MEMBER, not OWNER)
 */
public record UpdateMemberRoleRequest(
        @NotNull(message = "Role is required")
        OrgRole role
) {}
