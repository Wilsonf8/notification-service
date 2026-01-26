package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for a LiveConnect message.
 *
 * @param id the message ID
 * @param senderType the type of sender (USER, REP, SYSTEM)
 * @param senderId the sender's user ID if REP, null otherwise
 * @param senderName the name of the sender (visitor name or rep name)
 * @param content the message content
 * @param createdAt when the message was created
 */
public record LiveConnectMessageDto(
        UUID id,
        String senderType,
        UUID senderId,
        String senderName,
        String content,
        OffsetDateTime createdAt
) {}
