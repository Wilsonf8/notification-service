package com.notificationservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for Stripe integration.
 *
 * @param secretKey the Stripe secret API key
 * @param webhookSecret the Stripe webhook signing secret
 * @param priceIdMonthly the Stripe price ID for monthly billing ($10/month)
 * @param priceIdWeekly the Stripe price ID for weekly billing (testing)
 * @param priceIdDaily the Stripe price ID for daily billing (testing)
 */
@ConfigurationProperties(prefix = "app.stripe")
public record StripeProperties(
        String secretKey,
        String webhookSecret,
        String priceIdMonthly,
        String priceIdWeekly,
        String priceIdDaily
) {}
