package com.notificationservice.dto;

import com.notificationservice.entity.InvitationStatus;
import com.notificationservice.entity.OrgRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for an organization invitation.
 *
 * @param id the invitation ID
 * @param organizationId the organization ID
 * @param organizationName the organization name
 * @param organizationSlug the organization slug
 * @param inviterId the inviter's user ID
 * @param inviterUsername the inviter's username
 * @param inviteeId the invitee's user ID
 * @param inviteeUsername the invitee's username
 * @param inviteeFirstName the invitee's first name
 * @param inviteeLastName the invitee's last name
 * @param inviteeEmail the invitee's email
 * @param inviteeAvatarUrl the invitee's avatar URL
 * @param role the role offered in the invitation
 * @param status the invitation status
 * @param createdAt when the invitation was created
 */
public record OrganizationInvitationDto(
        UUID id,
        UUID organizationId,
        String organizationName,
        String organizationSlug,
        UUID inviterId,
        String inviterUsername,
        UUID inviteeId,
        String inviteeUsername,
        String inviteeFirstName,
        String inviteeLastName,
        String inviteeEmail,
        String inviteeAvatarUrl,
        OrgRole role,
        InvitationStatus status,
        OffsetDateTime createdAt
) {}
