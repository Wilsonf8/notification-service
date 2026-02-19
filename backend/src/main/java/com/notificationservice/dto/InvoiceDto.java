package com.notificationservice.dto;

/**
 * DTO representing a single Stripe invoice.
 *
 * @param id the Stripe invoice ID
 * @param date the invoice creation date in epoch seconds
 * @param description a human-readable description of the invoice
 * @param amountDue the amount due in cents
 * @param amountPaid the amount paid in cents
 * @param currency the three-letter ISO currency code
 * @param status the invoice status (paid, open, void, etc.)
 * @param invoicePdfUrl URL to download the invoice PDF
 * @param hostedInvoiceUrl URL to the Stripe-hosted invoice page
 */
public record InvoiceDto(
        String id,
        Long date,
        String description,
        Long amountDue,
        Long amountPaid,
        String currency,
        String status,
        String invoicePdfUrl,
        String hostedInvoiceUrl
) {}
