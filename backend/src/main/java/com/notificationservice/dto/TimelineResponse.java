package com.notificationservice.dto;

import java.util.List;

/**
 * Paginated response for the visitor timeline.
 *
 * @param events list of timeline events for the current page
 * @param totalElements total number of events
 * @param totalPages total number of pages
 * @param page current page number (0-indexed)
 */
public record TimelineResponse(
        List<TimelineEventDto> events,
        long totalElements,
        int totalPages,
        int page
) {}
