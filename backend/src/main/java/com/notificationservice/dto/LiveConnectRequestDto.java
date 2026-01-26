package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for a LiveConnect request.
 *
 * @param id the request ID
 * @param visitor the visitor who made/received the request
 * @param direction the request direction (USER_TO_REPS, REP_TO_USER)
 * @param status the request status (PENDING, ACCEPTED, EXPIRED, DECLINED, CANCELLED)
 * @param expiresAt when the request expires
 * @param createdAt when the request was created
 */
public record LiveConnectRequestDto(
        UUID id,
        LiveConnectVisitorDto visitor,
        String direction,
        String status,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt
) {}
