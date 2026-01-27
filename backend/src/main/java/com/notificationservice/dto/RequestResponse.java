package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for creating a call request.
 *
 * @param requestId the created request ID
 * @param expiresAt when the request expires
 */
public record RequestResponse(
        UUID requestId,
        OffsetDateTime expiresAt
) {}
