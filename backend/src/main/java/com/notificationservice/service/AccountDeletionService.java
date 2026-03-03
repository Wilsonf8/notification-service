package com.notificationservice.service;

import com.notificationservice.entity.*;
import com.notificationservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Handles account soft-deletion, reactivation, and related cleanup.
 * Soft-deleted accounts have a 30-day grace period before permanent purge.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationInvitationRepository organizationInvitationRepository;
    private final LiveConnectRepRepository liveConnectRepRepository;
    private final LiveConnectVisitorRepository liveConnectVisitorRepository;
    private final LiveConnectVisitorNoteRepository liveConnectVisitorNoteRepository;
    private final LiveConnectVisitorTagRepository liveConnectVisitorTagRepository;
    private final LiveConnectRequestRepository liveConnectRequestRepository;
    private final LiveConnectMessageRepository liveConnectMessageRepository;
    private final RepNotificationPreferenceRepository repNotificationPreferenceRepository;
    private final DeviceTokenRepository deviceTokenRepository;

    /**
     * Checks for blockers preventing account deletion.
     * A user cannot delete their account if they own any team (non-personal) organizations.
     *
     * @param user the user requesting deletion
     * @return list of team organization names the user owns (empty if no blockers)
     */
    @Transactional(readOnly = true)
    public List<DeletionBlocker> preflightCheck(User user) {
        return organizationMemberRepository.findByUserId(user.getId()).stream()
                .filter(m -> m.getRole() == OrgRole.OWNER)
                .filter(m -> !Boolean.TRUE.equals(m.getOrganization().getIsPersonal()))
                .map(m -> new DeletionBlocker(
                        m.getOrganization().getId(),
                        m.getOrganization().getName(),
                        m.getOrganization().getSlug()
                ))
                .toList();
    }

    /**
     * Orchestrates the full soft-delete flow for a user account.
     *
     * @param user the user to soft-delete
     * @throws IllegalStateException if the user owns team organizations
     */
    @Transactional
    public void softDeleteAccount(User user) {
        List<DeletionBlocker> blockers = preflightCheck(user);
        if (!blockers.isEmpty()) {
            String orgNames = blockers.stream()
                    .map(DeletionBlocker::name)
                    .collect(Collectors.joining(", "));
            throw new IllegalStateException(
                    "Cannot delete account: you own team organizations [" + orgNames + "]. Transfer ownership first.");
        }

        OffsetDateTime now = OffsetDateTime.now();

        // 1. Soft-delete the user
        user.setDeletedAt(now);
        userRepository.save(user);

        // 2. Soft-delete the personal org
        organizationRepository.findPersonalOrgByUserIdIncludingDeleted(user.getId())
                .ifPresent(personalOrg -> {
                    personalOrg.setDeletedAt(now);
                    organizationRepository.save(personalOrg);
                });

        // 3. Clean up team org memberships
        cleanupTeamMemberships(user);

        // 4. Delete all device tokens
        deviceTokenRepository.deleteAllByUserId(user.getId());

        // 5. Revoke all pending invitations (sent and received)
        revokeInvitations(user);

        log.info("Account soft-deleted for user {} ({})", user.getId(), user.getEmail());
    }

    /**
     * Reactivates a soft-deleted user account.
     * Restores the user and personal org, but team memberships require re-invitation.
     *
     * @param user the soft-deleted user to reactivate
     * @throws IllegalStateException if the user is not soft-deleted
     */
    @Transactional
    public void reactivateAccount(User user) {
        if (!user.isDeleted()) {
            throw new IllegalStateException("Account is not pending deletion.");
        }

        // Clear deletedAt on user
        user.setDeletedAt(null);
        userRepository.save(user);

        // Restore personal org
        organizationRepository.findPersonalOrgByUserIdIncludingDeleted(user.getId())
                .ifPresent(personalOrg -> {
                    personalOrg.setDeletedAt(null);
                    organizationRepository.save(personalOrg);

                    // Recreate personal org membership if missing
                    if (!organizationMemberRepository.existsByOrganizationIdAndUserId(
                            personalOrg.getId(), user.getId())) {
                        organizationMemberRepository.save(OrganizationMember.builder()
                                .organization(personalOrg)
                                .user(user)
                                .role(OrgRole.OWNER)
                                .build());
                    }
                });

        log.info("Account reactivated for user {} ({})", user.getId(), user.getEmail());
    }

    /**
     * For each team org membership, nullifies rep references in CRM data,
     * deletes rep records and notification preferences, and removes the membership.
     */
    private void cleanupTeamMemberships(User user) {
        List<OrganizationMember> memberships = organizationMemberRepository.findByUserId(user.getId());

        for (OrganizationMember membership : memberships) {
            Organization org = membership.getOrganization();
            if (Boolean.TRUE.equals(org.getIsPersonal())) {
                // Personal org membership is removed — will be recreated on reactivation
                organizationMemberRepository.delete(membership);
                continue;
            }

            // Find all rep records for this user in the team org's projects
            List<LiveConnectRep> reps = liveConnectRepRepository.findByUserId(user.getId()).stream()
                    .filter(r -> r.getProject().getOrganization().getId().equals(org.getId()))
                    .toList();

            if (!reps.isEmpty()) {
                List<UUID> repIds = reps.stream().map(LiveConnectRep::getId).toList();

                // Nullify all FK references to these reps
                liveConnectVisitorRepository.nullifyAssignedRep(repIds);
                liveConnectVisitorRepository.nullifyContactUpdatedByRep(repIds);
                liveConnectVisitorNoteRepository.nullifyAuthorRep(repIds);
                liveConnectVisitorTagRepository.nullifyTaggedByRep(repIds);
                liveConnectRequestRepository.nullifyInitiatedByRep(repIds);
                liveConnectRequestRepository.nullifyAcceptedByRep(repIds);
                liveConnectMessageRepository.nullifySenderIds(repIds, MessageSenderType.REP);

                // Delete notification preferences, then rep records
                repNotificationPreferenceRepository.deleteByRepIds(repIds);
                liveConnectRepRepository.deleteAllById(repIds);
            }

            // Remove the team membership
            organizationMemberRepository.delete(membership);
        }
    }

    /**
     * Revokes all pending invitations sent by or received by the user.
     */
    private void revokeInvitations(User user) {
        List<OrganizationInvitation> received =
                organizationInvitationRepository.findByInviteeIdAndStatus(user.getId(), InvitationStatus.PENDING);
        for (OrganizationInvitation inv : received) {
            inv.setStatus(InvitationStatus.REVOKED);
            inv.setRespondedAt(OffsetDateTime.now());
            organizationInvitationRepository.save(inv);
        }

        List<OrganizationInvitation> sent =
                organizationInvitationRepository.findByInviterIdAndStatus(user.getId(), InvitationStatus.PENDING);
        for (OrganizationInvitation inv : sent) {
            inv.setStatus(InvitationStatus.REVOKED);
            inv.setRespondedAt(OffsetDateTime.now());
            organizationInvitationRepository.save(inv);
        }
    }

    /**
     * Represents a blocker preventing account deletion.
     *
     * @param organizationId the org ID
     * @param name the org name
     * @param slug the org slug
     */
    public record DeletionBlocker(UUID organizationId, String name, String slug) {}
}
