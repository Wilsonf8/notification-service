package com.notificationservice.service;

/**
 * Thrown when a tier limit is exceeded (e.g., max projects, members, reps).
 */
public class TierLimitExceededException extends RuntimeException {
    public TierLimitExceededException(String message) {
        super(message);
    }
}
