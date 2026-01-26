package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for pinging a visitor (rep-initiated request).
 *
 * @param requestId the created request ID
 * @param expiresAt when the request expires
 */
public record PingVisitorResponse(
        UUID requestId,
        OffsetDateTime expiresAt
) {}
