package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for creating a Stripe Checkout session.
 *
 * @param priceId the Stripe price ID to subscribe to
 */
public record CheckoutSessionRequest(
        @NotBlank String priceId
) {}
