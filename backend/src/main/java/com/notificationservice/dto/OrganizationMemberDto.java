package com.notificationservice.dto;

import com.notificationservice.entity.OrgRole;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO representing a member of an organization.
 *
 * @param id the unique identifier of the membership
 * @param userId the user's unique identifier
 * @param username the user's username
 * @param email the user's email address
 * @param avatarUrl the user's avatar URL
 * @param role the user's role in the organization
 * @param joinedAt when the user joined the organization
 */
public record OrganizationMemberDto(
        UUID id,
        UUID userId,
        String username,
        String email,
        String avatarUrl,
        OrgRole role,
        OffsetDateTime joinedAt
) {}
