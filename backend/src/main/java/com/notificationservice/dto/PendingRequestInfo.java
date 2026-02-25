package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Information about a pending call request.
 * Used to restore WAITING state when visitor navigates between pages.
 *
 * @param requestId the unique identifier of the pending request
 * @param expiresAt when the request expires
 * @param direction the direction of the request (USER_TO_REPS, REP_TO_USER, MUTUAL)
 * @param repName the rep's display name (populated for REP_TO_USER, null otherwise)
 */
public record PendingRequestInfo(
        UUID requestId,
        OffsetDateTime expiresAt,
        String direction,
        String repName
) {}
