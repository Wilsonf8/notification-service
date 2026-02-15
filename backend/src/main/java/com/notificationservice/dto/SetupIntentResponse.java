package com.notificationservice.dto;

/**
 * Response DTO containing the Stripe SetupIntent client secret for updating payment method.
 *
 * @param clientSecret the SetupIntent client secret
 */
public record SetupIntentResponse(
        String clientSecret
) {}
