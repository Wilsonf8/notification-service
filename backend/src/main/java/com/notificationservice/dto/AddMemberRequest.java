package com.notificationservice.dto;

import com.notificationservice.entity.OrgRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for adding a member to an organization.
 *
 * @param username the username of the user to add
 * @param role the role to assign (ADMIN or MEMBER, not OWNER)
 */
public record AddMemberRequest(
        @NotBlank(message = "Username is required")
        String username,

        @NotNull(message = "Role is required")
        OrgRole role
) {}
