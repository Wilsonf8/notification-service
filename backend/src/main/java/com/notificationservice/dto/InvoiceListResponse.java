package com.notificationservice.dto;

import java.util.List;

/**
 * Paginated response for listing Stripe invoices using cursor-based pagination.
 *
 * @param invoices the list of invoices for the current page
 * @param hasMore whether more invoices exist beyond the current page
 * @param nextCursor the last invoice ID to use as startingAfter for the next page
 */
public record InvoiceListResponse(
        List<InvoiceDto> invoices,
        boolean hasMore,
        String nextCursor
) {}
