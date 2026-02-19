package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO representing a single visitor visit (browsing session).
 *
 * @param id              the visit ID
 * @param startedAt       when the visit started
 * @param endedAt         when the visit ended, or null if still active
 * @param durationSeconds duration in seconds, or null if still active
 */
public record VisitorVisitDto(
        UUID id,
        OffsetDateTime startedAt,
        OffsetDateTime endedAt,
        Long durationSeconds
) {}
