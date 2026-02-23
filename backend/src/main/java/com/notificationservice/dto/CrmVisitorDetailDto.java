package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full visitor CRM profile with all data sections.
 *
 * @param id the visitor's internal ID
 * @param visitorId the client-side visitor identifier
 * @param name the visitor's name
 * @param email the visitor's email
 * @param countryCode ISO country code
 * @param country full country name
 * @param region region/state name
 * @param city city name
 * @param browserName browser name
 * @param browserVersion browser version
 * @param osName operating system name
 * @param osVersion operating system version
 * @param deviceType device type (desktop/mobile/tablet)
 * @param ipAddress visitor's IP address
 * @param firstSeenAt when the visitor was first seen
 * @param lastSeenAt when the visitor was last active
 * @param pipelineStage current pipeline stage
 * @param leadScore auto-calculated lead score (0-100)
 * @param assignedRep the assigned rep (null if unassigned)
 * @param tags list of tags assigned to this visitor
 * @param visitStats visit count statistics across time windows
 * @param engagementStats engagement statistics across time windows
 */
public record CrmVisitorDetailDto(
        UUID id,
        String visitorId,
        String name,
        String email,
        String countryCode,
        String country,
        String region,
        String city,
        String browserName,
        String browserVersion,
        String osName,
        String osVersion,
        String deviceType,
        String ipAddress,
        OffsetDateTime firstSeenAt,
        OffsetDateTime lastSeenAt,
        String pipelineStage,
        int leadScore,
        LiveConnectRepDto assignedRep,
        List<TagDto> tags,
        VisitorVisitStatsDto visitStats,
        VisitorEngagementStatsDto engagementStats
) {}
