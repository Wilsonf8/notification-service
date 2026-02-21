package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for sending a message in a conversation.
 *
 * @param content the message content
 * @param messageId optional client-generated UUID for deduplication with data channel messages
 */
public record SendMessageRequest(
        @NotBlank(message = "Content is required")
        @Size(max = 2000, message = "Message cannot exceed 2000 characters")
        String content,
        String messageId
) {}
