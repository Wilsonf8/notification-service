package com.notificationservice.dto;

import java.util.List;

/**
 * Response DTO for the visitor detail endpoint, including visit statistics and history.
 *
 * @param stats       visit count statistics across time windows
 * @param engagement  engagement activity statistics (pings, requests, calls)
 * @param recentVisits list of recent visits for the current page
 * @param totalVisits total number of visits across all time
 * @param totalPages  total number of pages available for pagination
 */
public record VisitorDetailResponse(
        VisitorVisitStatsDto stats,
        VisitorEngagementStatsDto engagement,
        List<VisitorVisitDto> recentVisits,
        long totalVisits,
        int totalPages
) {}
