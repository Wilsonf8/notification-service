package com.notificationservice.dto;

/**
 * DTO representing the upcoming Stripe invoice for a subscription.
 *
 * @param amountDue the amount due in cents
 * @param currency the three-letter ISO currency code
 * @param nextBillingDate the next billing date in epoch seconds
 * @param description a human-readable description of the upcoming charge
 * @param cardBrand the payment card brand (e.g. "visa"), nullable
 * @param cardLast4 the last four digits of the payment card, nullable
 */
public record UpcomingInvoiceDto(
        Long amountDue,
        String currency,
        Long nextBillingDate,
        String description,
        String cardBrand,
        String cardLast4
) {}
