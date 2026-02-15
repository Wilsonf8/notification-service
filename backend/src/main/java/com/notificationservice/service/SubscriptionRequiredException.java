package com.notificationservice.service;

/**
 * Thrown when an operation requires an active subscription but none exists.
 */
public class SubscriptionRequiredException extends RuntimeException {
    public SubscriptionRequiredException(String message) {
        super(message);
    }
}
