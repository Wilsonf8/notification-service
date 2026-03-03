package com.notificationservice.repository;

import com.notificationservice.entity.InvitationStatus;
import com.notificationservice.entity.OrganizationInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for organization invitation operations.
 */
public interface OrganizationInvitationRepository extends JpaRepository<OrganizationInvitation, UUID> {

    /**
     * Finds invitations for an organization with a specific status.
     */
    List<OrganizationInvitation> findByOrganizationIdAndStatus(UUID organizationId, InvitationStatus status);

    /**
     * Finds invitations for a user (invitee) with a specific status.
     */
    List<OrganizationInvitation> findByInviteeIdAndStatus(UUID inviteeId, InvitationStatus status);

    /**
     * Counts invitations for a user (invitee) with a specific status.
     */
    long countByInviteeIdAndStatus(UUID inviteeId, InvitationStatus status);

    /**
     * Counts invitations for an organization with a specific status.
     * @param organizationId the organization ID
     * @param status the invitation status
     * @return number of matching invitations
     */
    long countByOrganizationIdAndStatus(UUID organizationId, InvitationStatus status);

    /**
     * Checks if a pending invitation already exists for this org/user combination.
     */
    boolean existsByOrganizationIdAndInviteeIdAndStatus(UUID organizationId, UUID inviteeId, InvitationStatus status);

    /**
     * Finds pending invitations sent by a user.
     * @param inviterId the inviter's user ID
     * @param status the invitation status
     * @return list of matching invitations
     */
    List<OrganizationInvitation> findByInviterIdAndStatus(UUID inviterId, InvitationStatus status);
}
