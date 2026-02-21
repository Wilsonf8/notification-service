package com.notificationservice.service;

import com.notificationservice.entity.OrgRole;
import com.notificationservice.entity.Organization;
import com.notificationservice.entity.OrganizationMember;
import com.notificationservice.entity.Subscription;
import com.notificationservice.entity.SubscriptionStatus;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.SubscriptionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.stripe.exception.StripeException;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for managing organization subscriptions.
 * Handles subscription state changes from Stripe webhooks with Redis caching.
 */
@Service
@Slf4j
public class SubscriptionService {

    private static final String REDIS_SUB_PREFIX = "sub:org:";
    private static final long CACHE_TTL_MINUTES = 5;

    private final SubscriptionRepository subscriptionRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationService organizationService;
    private final StringRedisTemplate redisTemplate;

    /**
     * Constructor with lazy-loaded OrganizationService to break circular dependency
     * (SubscriptionService -> OrganizationService -> TierService -> SubscriptionService).
     */
    public SubscriptionService(
            SubscriptionRepository subscriptionRepository,
            OrganizationRepository organizationRepository,
            OrganizationMemberRepository organizationMemberRepository,
            @Lazy OrganizationService organizationService,
            StringRedisTemplate redisTemplate) {
        this.subscriptionRepository = subscriptionRepository;
        this.organizationRepository = organizationRepository;
        this.organizationMemberRepository = organizationMemberRepository;
        this.organizationService = organizationService;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Checks if an organization has an active subscription. Uses Redis cache with 5min TTL.
     * @param orgId the organization ID
     * @return true if subscription is ACTIVE or PAST_DUE
     */
    public boolean isOrganizationSubscriptionActive(UUID orgId) {
        String cacheKey = REDIS_SUB_PREFIX + orgId;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if (cached != null) {
            return "true".equals(cached);
        }

        boolean active = subscriptionRepository.findByOrganizationId(orgId)
                .map(Subscription::isActive)
                .orElse(false);

        redisTemplate.opsForValue().set(cacheKey, String.valueOf(active), CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        return active;
    }

    /**
     * Gets the subscription for an organization (for billing page display).
     * @param orgId the organization ID
     * @return the subscription if it exists
     */
    @Transactional(readOnly = true)
    public Optional<Subscription> getSubscriptionForOrganization(UUID orgId) {
        return subscriptionRepository.findByOrganizationId(orgId);
    }

    /**
     * Handles checkout.session.completed webhook event.
     * Uses find-or-update pattern: reuses existing subscription record if present.
     * @param orgId the organization ID from client_reference_id
     * @param stripeCustomerId the Stripe customer ID
     * @param stripeSubscriptionId the Stripe subscription ID
     * @param stripePriceId the Stripe price ID
     * @param periodStart the current period start epoch seconds
     * @param periodEnd the current period end epoch seconds
     * @param eventTimestamp the event created timestamp (epoch seconds)
     */
    @Transactional
    public void handleCheckoutCompleted(UUID orgId, String stripeCustomerId, String stripeSubscriptionId,
                                        String stripePriceId,
                                        Long periodStart, Long periodEnd, long eventTimestamp) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + orgId));

        // Ensure stripeCustomerId is persisted on the organization
        if (stripeCustomerId != null && org.getStripeCustomerId() == null) {
            org.setStripeCustomerId(stripeCustomerId);
            organizationRepository.save(org);
        }

        Optional<Subscription> existing = subscriptionRepository.findByOrganizationId(orgId);

        if (existing.isPresent()) {
            Subscription sub = existing.get();
            sub.setStripeSubscriptionId(stripeSubscriptionId);
            sub.setStripePriceId(stripePriceId);
            sub.setStatus(SubscriptionStatus.ACTIVE);
            sub.setCurrentPeriodStart(epochToOffsetDateTime(periodStart));
            sub.setCurrentPeriodEnd(epochToOffsetDateTime(periodEnd));
            sub.setCancelAtPeriodEnd(false);
            sub.setCanceledAt(null);
            sub.setLastEventTimestamp(eventTimestamp);
            subscriptionRepository.save(sub);
        } else {
            Subscription sub = Subscription.builder()
                    .organization(org)
                    .stripeSubscriptionId(stripeSubscriptionId)
                    .stripePriceId(stripePriceId)
                    .status(SubscriptionStatus.ACTIVE)
                    .currentPeriodStart(epochToOffsetDateTime(periodStart))
                    .currentPeriodEnd(epochToOffsetDateTime(periodEnd))
                    .lastEventTimestamp(eventTimestamp)
                    .build();
            subscriptionRepository.save(sub);
        }

        invalidateCache(orgId);
        log.info("Checkout completed for org {}: subscription {}", orgId, stripeSubscriptionId);
    }

    /**
     * Handles customer.subscription.updated webhook event.
     * Skips out-of-order events based on event timestamp.
     * @param stripeSubscriptionId the Stripe subscription ID
     * @param stripeStatus the Stripe subscription status string
     * @param stripePriceId the Stripe price ID (may be null)
     * @param periodStart the current period start epoch seconds
     * @param periodEnd the current period end epoch seconds
     * @param cancelAtPeriodEnd whether the subscription will cancel at period end
     * @param canceledAt the cancellation timestamp (epoch seconds), or null
     * @param eventTimestamp the event created timestamp (epoch seconds)
     */
    @Transactional
    public void handleSubscriptionUpdated(String stripeSubscriptionId, String stripeStatus,
                                          String stripePriceId,
                                          Long periodStart, Long periodEnd, boolean cancelAtPeriodEnd,
                                          Long canceledAt, long eventTimestamp) {
        Subscription sub = subscriptionRepository.findByStripeSubscriptionId(stripeSubscriptionId)
                .orElse(null);

        if (sub == null) {
            log.warn("Subscription not found for update: {}", stripeSubscriptionId);
            return;
        }

        if (sub.getLastEventTimestamp() != null && eventTimestamp < sub.getLastEventTimestamp()) {
            log.debug("Skipping out-of-order event for subscription {}: event {} < last {}",
                    stripeSubscriptionId, eventTimestamp, sub.getLastEventTimestamp());
            return;
        }

        sub.setStatus(mapStripeStatus(stripeStatus));
        if (stripePriceId != null) {
            sub.setStripePriceId(stripePriceId);
        }
        sub.setCurrentPeriodStart(epochToOffsetDateTime(periodStart));
        sub.setCurrentPeriodEnd(epochToOffsetDateTime(periodEnd));
        sub.setCancelAtPeriodEnd(cancelAtPeriodEnd);
        sub.setCanceledAt(canceledAt != null ? epochToOffsetDateTime(canceledAt) : null);
        sub.setLastEventTimestamp(eventTimestamp);
        subscriptionRepository.save(sub);

        invalidateCache(sub.getOrganization().getId());
        log.info("Subscription updated {}: status={}", stripeSubscriptionId, stripeStatus);
    }

    /**
     * Handles customer.subscription.deleted webhook event.
     * @param stripeSubscriptionId the Stripe subscription ID
     * @param eventTimestamp the event created timestamp (epoch seconds)
     */
    @Transactional
    public void handleSubscriptionDeleted(String stripeSubscriptionId, long eventTimestamp) {
        Subscription sub = subscriptionRepository.findByStripeSubscriptionId(stripeSubscriptionId)
                .orElse(null);

        if (sub == null) {
            log.warn("Subscription not found for deletion: {}", stripeSubscriptionId);
            return;
        }

        if (sub.getLastEventTimestamp() != null && eventTimestamp < sub.getLastEventTimestamp()) {
            log.debug("Skipping out-of-order delete for subscription {}", stripeSubscriptionId);
            return;
        }

        sub.setStatus(SubscriptionStatus.CANCELED);
        sub.setCanceledAt(OffsetDateTime.now());
        sub.setLastEventTimestamp(eventTimestamp);
        subscriptionRepository.save(sub);

        invalidateCache(sub.getOrganization().getId());
        log.info("Subscription deleted: {}", stripeSubscriptionId);
    }

    /**
     * Cancels any incomplete subscription for the organization.
     * Used before creating a new subscription to clean up stale attempts.
     *
     * @param orgId the organization ID
     * @param stripeService the Stripe service for API calls
     */
    @Transactional
    public void cancelIncompleteSubscription(UUID orgId, StripeService stripeService) {
        subscriptionRepository.findByOrganizationId(orgId).ifPresent(sub -> {
            if (sub.getStatus() == SubscriptionStatus.INCOMPLETE) {
                try {
                    stripeService.cancelSubscription(sub.getStripeSubscriptionId());
                } catch (Exception e) {
                    log.warn("Failed to cancel incomplete sub: {}", e.getMessage());
                }
                subscriptionRepository.delete(sub);
                invalidateCache(orgId);
            }
        });
    }

    /**
     * Creates or updates a pending subscription record for the organization.
     *
     * @param orgId the organization ID
     * @param stripeSubscriptionId the Stripe subscription ID
     * @param stripePriceId the Stripe price ID
     */
    @Transactional
    public void createPendingSubscription(UUID orgId, String stripeSubscriptionId, String stripePriceId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + orgId));

        Optional<Subscription> existing = subscriptionRepository.findByOrganizationId(orgId);
        if (existing.isPresent()) {
            Subscription sub = existing.get();
            sub.setStripeSubscriptionId(stripeSubscriptionId);
            sub.setStripePriceId(stripePriceId);
            sub.setStatus(SubscriptionStatus.INCOMPLETE);
            sub.setCancelAtPeriodEnd(false);
            sub.setCanceledAt(null);
            subscriptionRepository.save(sub);
        } else {
            subscriptionRepository.save(Subscription.builder()
                    .organization(org)
                    .stripeSubscriptionId(stripeSubscriptionId)
                    .stripePriceId(stripePriceId)
                    .status(SubscriptionStatus.INCOMPLETE)
                    .build());
        }
        invalidateCache(orgId);
    }

    /**
     * Cancels the subscription at the end of the current billing period.
     *
     * @param orgId the organization ID
     * @param stripeService the Stripe service for API calls
     * @throws StripeException if the Stripe API call fails
     */
    @Transactional
    public void cancelAtPeriodEnd(UUID orgId, StripeService stripeService) throws StripeException {
        Subscription sub = subscriptionRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found"));
        if (!sub.isActive()) {
            throw new IllegalArgumentException("Subscription is not active");
        }

        stripeService.cancelSubscriptionAtPeriodEnd(sub.getStripeSubscriptionId());
        sub.setCancelAtPeriodEnd(true);
        subscriptionRepository.save(sub);
        invalidateCache(orgId);
    }

    /**
     * Reactivates a subscription that was set to cancel at period end.
     *
     * @param orgId the organization ID
     * @param stripeService the Stripe service for API calls
     * @throws StripeException if the Stripe API call fails
     */
    @Transactional
    public void reactivateSubscription(UUID orgId, StripeService stripeService) throws StripeException {
        Subscription sub = subscriptionRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found"));
        if (!sub.getCancelAtPeriodEnd()) {
            throw new IllegalArgumentException("Subscription is not pending cancellation");
        }

        stripeService.reactivateSubscription(sub.getStripeSubscriptionId());
        sub.setCancelAtPeriodEnd(false);
        sub.setCanceledAt(null);
        subscriptionRepository.save(sub);
        invalidateCache(orgId);
    }

    /**
     * Handles the upgrade of a personal organization to a paid team organization.
     * Called from the webhook handler when payment succeeds and upgrade metadata is present.
     * Converts the personal org to a team org with new name/slug, and creates a fresh personal org for the owner.
     *
     * @param orgId the organization ID being upgraded
     * @param newName the new organization name
     * @param newSlug the new organization slug
     */
    @Transactional
    public void handleUpgradeOnCheckout(UUID orgId, String newName, String newSlug) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + orgId));

        if (!Boolean.TRUE.equals(org.getIsPersonal())) {
            log.warn("Upgrade called on non-personal org {}, skipping", orgId);
            return;
        }

        // Re-generate slug to handle race conditions where it may have been taken
        String finalSlug = organizationService.generateUniqueSlug(newName);

        // 1. Convert personal org to team org
        org.setIsPersonal(false);
        org.setName(newName);
        org.setSlug(finalSlug);
        organizationRepository.save(org);

        // 2. Create a new personal org for the owner
        String ownerUsername = org.getOwner().getUsername();
        String personalSlug = organizationService.generateUniqueSlug(ownerUsername);

        Organization personalOrg = organizationRepository.save(Organization.builder()
                .name(ownerUsername + "'s Projects")
                .slug(personalSlug)
                .owner(org.getOwner())
                .isPersonal(true)
                .build());

        organizationMemberRepository.save(OrganizationMember.builder()
                .organization(personalOrg)
                .user(org.getOwner())
                .role(OrgRole.OWNER)
                .build());

        invalidateCache(orgId);
        log.info("Upgraded personal org {} to team org '{}' (slug: {}), created new personal org '{}'",
                orgId, newName, finalSlug, personalSlug);
    }

    /**
     * Maps a Stripe subscription status string to our SubscriptionStatus enum.
     * @param stripeStatus the Stripe status string
     * @return the corresponding SubscriptionStatus
     */
    private SubscriptionStatus mapStripeStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "active", "trialing" -> SubscriptionStatus.ACTIVE;
            case "past_due" -> SubscriptionStatus.PAST_DUE;
            case "canceled" -> SubscriptionStatus.CANCELED;
            case "incomplete" -> SubscriptionStatus.INCOMPLETE;
            case "incomplete_expired", "unpaid" -> SubscriptionStatus.INACTIVE;
            default -> {
                log.warn("Unknown Stripe status: {}, defaulting to INACTIVE", stripeStatus);
                yield SubscriptionStatus.INACTIVE;
            }
        };
    }

    private void invalidateCache(UUID orgId) {
        redisTemplate.delete(REDIS_SUB_PREFIX + orgId);
    }

    private OffsetDateTime epochToOffsetDateTime(Long epochSeconds) {
        if (epochSeconds == null) return null;
        return OffsetDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneOffset.UTC);
    }
}
