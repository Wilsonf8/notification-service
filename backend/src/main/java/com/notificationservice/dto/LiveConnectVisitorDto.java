package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for a LiveConnect visitor.
 *
 * @param id                   the visitor record ID
 * @param visitorId            the client-side visitor identifier
 * @param name                 the visitor's name (if provided)
 * @param email                the visitor's email (if provided)
 * @param currentPage          the page the visitor is currently on (from metadata)
 * @param lastSeenAt           when the visitor was last active
 * @param hasActiveRequest     true if the visitor has a pending request in the queue
 * @param isConnected          true if the visitor has an active WebSocket connection
 * @param isPingable           true if the visitor can be pinged (connected and not in cooldown)
 * @param isFirstVisit         true when the visitor's total visit count is 1 or less
 * @param previousVisitEndedAt when the last completed visit ended, for "Last seen X ago" display
 * @param totalVisitCount      total number of visits for this visitor
 * @param countryCode          ISO 3166-1 alpha-2 country code
 * @param country              full country name
 * @param city                 city name
 * @param browserName          browser name (e.g., "Chrome")
 * @param osName               operating system name (e.g., "Mac OS X")
 * @param deviceType           device type: "desktop", "mobile", or "tablet"
 */
public record LiveConnectVisitorDto(
        UUID id,
        String visitorId,
        String name,
        String email,
        String currentPage,
        OffsetDateTime lastSeenAt,
        boolean hasActiveRequest,
        boolean isConnected,
        boolean isPingable,
        boolean isFirstVisit,
        OffsetDateTime previousVisitEndedAt,
        int totalVisitCount,
        String countryCode,
        String country,
        String city,
        String browserName,
        String osName,
        String deviceType
) {}
