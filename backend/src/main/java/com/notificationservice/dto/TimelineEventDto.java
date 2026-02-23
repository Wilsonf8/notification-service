package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for a unified timeline event.
 *
 * @param type the event type (VISIT, PAGE_VIEW, CALL, REQUEST, NOTE, CONTACT_FORM)
 * @param id the event's unique ID
 * @param timestamp when the event occurred
 * @param data additional event-specific data
 */
public record TimelineEventDto(
        String type,
        UUID id,
        OffsetDateTime timestamp,
        Map<String, Object> data
) {}
