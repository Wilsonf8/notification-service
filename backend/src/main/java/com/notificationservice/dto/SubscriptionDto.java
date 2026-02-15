package com.notificationservice.dto;

import com.notificationservice.entity.SubscriptionStatus;
import java.time.OffsetDateTime;

/**
 * Response DTO representing an organization's subscription status.
 *
 * @param status the current subscription status
 * @param stripePriceId the Stripe price ID
 * @param currentPeriodStart when the current billing period started
 * @param currentPeriodEnd when the current billing period ends
 * @param cancelAtPeriodEnd whether the subscription will cancel at period end
 * @param canceledAt when the subscription was canceled
 */
public record SubscriptionDto(
        SubscriptionStatus status,
        String stripePriceId,
        OffsetDateTime currentPeriodStart,
        OffsetDateTime currentPeriodEnd,
        Boolean cancelAtPeriodEnd,
        OffsetDateTime canceledAt
) {}
