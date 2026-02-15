package com.notificationservice.dto;

/**
 * Response DTO containing the Stripe PaymentIntent client secret for the Payment Element.
 *
 * @param clientSecret the PaymentIntent client secret
 */
public record CheckoutSessionResponse(
        String clientSecret
) {}
