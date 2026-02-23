package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Lightweight DTO for a visitor in the CRM list view.
 *
 * @param id the visitor's internal ID
 * @param name the visitor's name
 * @param email the visitor's email
 * @param countryCode ISO country code
 * @param country full country name
 * @param city city name
 * @param lastSeenAt when the visitor was last active
 * @param visitCount total number of visits
 * @param leadScore auto-calculated lead score (0-100)
 * @param pipelineStage current pipeline stage
 * @param assignedRep the assigned rep (null if unassigned)
 * @param tags list of tags assigned to this visitor
 */
public record CrmVisitorListItemDto(
        UUID id,
        String name,
        String email,
        String countryCode,
        String country,
        String city,
        OffsetDateTime lastSeenAt,
        long visitCount,
        int leadScore,
        String pipelineStage,
        LiveConnectRepDto assignedRep,
        List<TagDto> tags
) {}
