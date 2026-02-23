package com.notificationservice.dto;

import java.time.OffsetDateTime;

/**
 * Response DTO for a page view in a visitor's browsing history.
 *
 * @param url the page URL
 * @param title the page title
 * @param visitedAt when the page was visited
 * @param durationMs time spent on the page in milliseconds
 */
public record PageViewDto(
        String url,
        String title,
        OffsetDateTime visitedAt,
        Integer durationMs
) {}
