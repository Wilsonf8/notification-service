package com.notificationservice.dto;

/**
 * DTO containing visit count statistics for a visitor across multiple time windows.
 *
 * @param visits24h number of visits in the last 24 hours
 * @param visits3d  number of visits in the last 3 days
 * @param visits7d  number of visits in the last 7 days
 * @param total     total number of visits for the visitor
 */
public record VisitorVisitStatsDto(
        long visits24h,
        long visits3d,
        long visits7d,
        long total
) {}
