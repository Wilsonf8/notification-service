package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO representing an active call for the dashboard.
 *
 * @param conversationId the conversation ID
 * @param visitorId the visitor's internal ID
 * @param visitorName the visitor's display name
 * @param repId the rep's internal ID
 * @param repUserId the rep's user ID
 * @param repName the rep's display name
 * @param startedAt when the call started
 */
public record ActiveCallDto(
        UUID conversationId,
        UUID visitorId,
        String visitorName,
        UUID repId,
        UUID repUserId,
        String repName,
        OffsetDateTime startedAt
) {}
