package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for sending a message.
 *
 * @param messageId the created message ID
 * @param createdAt when the message was created
 */
public record MessageResponse(
        UUID messageId,
        OffsetDateTime createdAt
) {}
