package com.notificationservice.service;

import com.notificationservice.dto.TierLimitsDto;
import com.notificationservice.entity.InvitationStatus;
import com.notificationservice.entity.Organization;
import com.notificationservice.repository.LiveConnectEmbedKeyRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.OrganizationInvitationRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Centralized service for tier-based feature gating.
 * Derives tier from org.isPersonal + subscription status -- no schema changes needed.
 */
@Service
@RequiredArgsConstructor
public class TierService {

    // Free tier limits
    private static final int FREE_MAX_PROJECTS = 3;
    private static final int FREE_MAX_MEMBERS = 1;
    private static final int FREE_MAX_REPS_PER_PROJECT = 1;
    private static final int FREE_MAX_EMBED_KEYS_PER_PROJECT = 1;

    // Pro tier limits
    private static final int PRO_MAX_PROJECTS = 5;
    private static final int PRO_MAX_MEMBERS = 10;
    private static final int PRO_MAX_REPS_PER_PROJECT = 5;
    private static final int PRO_MAX_EMBED_KEYS_PER_PROJECT = 3;

    private final SubscriptionService subscriptionService;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationInvitationRepository invitationRepository;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectEmbedKeyRepository embedKeyRepository;

    /**
     * Checks if an organization is on the free tier.
     * @param org the organization
     * @return true if the org is a personal org (free tier)
     */
    public boolean isFreeTier(Organization org) {
        return Boolean.TRUE.equals(org.getIsPersonal());
    }

    /**
     * Checks if an organization is active. Free tier orgs are always active.
     * Team orgs require an active subscription.
     * @param org the organization
     * @return true if the org is active
     */
    public boolean isOrgActive(Organization org) {
        if (isFreeTier(org)) {
            return true;
        }
        return subscriptionService.isOrganizationSubscriptionActive(org.getId());
    }

    /**
     * Throws SubscriptionRequiredException if a team org is inactive.
     * @param org the organization
     * @throws SubscriptionRequiredException if team org has no active subscription
     */
    public void enforceOrgActive(Organization org) {
        if (!isOrgActive(org)) {
            throw new SubscriptionRequiredException("Active subscription required to perform this action");
        }
    }

    /**
     * Enforces the project creation limit for an organization.
     * @param org the organization
     * @throws TierLimitExceededException if the project limit is reached
     */
    @Transactional(readOnly = true)
    public void enforceProjectLimit(Organization org) {
        int max = isFreeTier(org) ? FREE_MAX_PROJECTS : PRO_MAX_PROJECTS;
        long current = projectRepository.countByOrganizationIdAndNotDeleted(org.getId());
        if (current >= max) {
            throw new TierLimitExceededException(
                    "Project limit reached (" + max + "). Upgrade to create more projects.");
        }
    }

    /**
     * Enforces the member limit for an organization.
     * Counts current members plus pending invitations.
     * @param org the organization
     * @throws TierLimitExceededException if the member limit is reached
     */
    @Transactional(readOnly = true)
    public void enforceMemberLimit(Organization org) {
        int max = isFreeTier(org) ? FREE_MAX_MEMBERS : PRO_MAX_MEMBERS;
        long currentMembers = organizationMemberRepository.countByOrganizationId(org.getId());
        long pendingInvites = invitationRepository.countByOrganizationIdAndStatus(
                org.getId(), InvitationStatus.PENDING);
        if (currentMembers + pendingInvites >= max) {
            throw new TierLimitExceededException(
                    "Member limit reached (" + max + "). Upgrade to add more members.");
        }
    }

    /**
     * Enforces the rep limit per project.
     * @param org the organization
     * @param projectId the project ID
     * @throws TierLimitExceededException if the rep limit is reached
     */
    @Transactional(readOnly = true)
    public void enforceRepLimit(Organization org, UUID projectId) {
        int max = isFreeTier(org) ? FREE_MAX_REPS_PER_PROJECT : PRO_MAX_REPS_PER_PROJECT;
        long current = repRepository.countByProjectId(projectId);
        if (current >= max) {
            throw new TierLimitExceededException(
                    "Rep limit reached (" + max + " per project). Upgrade to add more reps.");
        }
    }

    /**
     * Enforces the embed key limit per project.
     * @param org the organization
     * @param projectId the project ID
     * @throws TierLimitExceededException if the embed key limit is reached
     */
    @Transactional(readOnly = true)
    public void enforceEmbedKeyLimit(Organization org, UUID projectId) {
        int max = isFreeTier(org) ? FREE_MAX_EMBED_KEYS_PER_PROJECT : PRO_MAX_EMBED_KEYS_PER_PROJECT;
        long current = embedKeyRepository.countActiveByProjectId(projectId);
        if (current >= max) {
            throw new TierLimitExceededException(
                    "Embed key limit reached (" + max + " per project). Upgrade to create more keys.");
        }
    }

    /**
     * Enforces that widget customization is allowed (Pro only).
     * @param org the organization
     * @throws TierLimitExceededException if the org is on the free tier
     */
    public void enforceWidgetCustomization(Organization org) {
        if (isFreeTier(org)) {
            throw new TierLimitExceededException(
                    "Widget customization requires a Pro plan. Create a team to upgrade.");
        }
    }

    /**
     * Enforces that invitations are allowed (Pro only).
     * @param org the organization
     * @throws TierLimitExceededException if the org is on the free tier
     */
    public void enforceInvitationsEnabled(Organization org) {
        if (isFreeTier(org)) {
            throw new TierLimitExceededException(
                    "Invitations require a Pro plan. Create a team to invite members.");
        }
    }

    /**
     * Returns the full tier limits and current usage for an organization.
     * @param org the organization
     * @return tier limits DTO with current usage data
     */
    @Transactional(readOnly = true)
    public TierLimitsDto getTierLimits(Organization org) {
        boolean free = isFreeTier(org);
        return new TierLimitsDto(
                free ? "FREE" : "PRO",
                free ? FREE_MAX_PROJECTS : PRO_MAX_PROJECTS,
                projectRepository.countByOrganizationIdAndNotDeleted(org.getId()),
                free ? FREE_MAX_MEMBERS : PRO_MAX_MEMBERS,
                organizationMemberRepository.countByOrganizationId(org.getId()),
                free ? FREE_MAX_REPS_PER_PROJECT : PRO_MAX_REPS_PER_PROJECT,
                free ? FREE_MAX_EMBED_KEYS_PER_PROJECT : PRO_MAX_EMBED_KEYS_PER_PROJECT,
                !free,
                !free,
                isOrgActive(org)
        );
    }
}
