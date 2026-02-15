package com.notificationservice.entity;

/**
 * Status of an organization's Stripe subscription.
 */
public enum SubscriptionStatus {
    ACTIVE,
    PAST_DUE,
    CANCELED,
    INCOMPLETE,
    INACTIVE
}
