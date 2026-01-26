package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for a LiveConnect conversation.
 *
 * @param id the conversation ID
 * @param visitor the visitor in the conversation
 * @param rep the rep in the conversation (null for contact_form until assigned)
 * @param type the conversation type (VIDEO_CALL, CONTACT_FORM)
 * @param status the conversation status (ACTIVE, ENDED)
 * @param callDurationSeconds the duration of the call in seconds (null for contact_form)
 * @param startedAt when the conversation started
 * @param endedAt when the conversation ended (null if still active)
 * @param messageCount the count of messages in the conversation
 */
public record LiveConnectConversationDto(
        UUID id,
        LiveConnectVisitorDto visitor,
        LiveConnectRepDto rep,
        String type,
        String status,
        Integer callDurationSeconds,
        OffsetDateTime startedAt,
        OffsetDateTime endedAt,
        long messageCount
) {}
