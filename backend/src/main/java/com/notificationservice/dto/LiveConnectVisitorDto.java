package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for a LiveConnect visitor.
 *
 * @param id the visitor record ID
 * @param visitorId the client-side visitor identifier
 * @param name the visitor's name (if provided)
 * @param email the visitor's email (if provided)
 * @param currentPage the page the visitor is currently on (from metadata)
 * @param lastSeenAt when the visitor was last active
 * @param hasActiveRequest true if the visitor has a pending request in the queue
 */
public record LiveConnectVisitorDto(
        UUID id,
        String visitorId,
        String name,
        String email,
        String currentPage,
        OffsetDateTime lastSeenAt,
        boolean hasActiveRequest
) {}
