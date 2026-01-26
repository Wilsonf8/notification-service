package com.notificationservice.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request for obtaining a LiveKit token.
 *
 * @param conversationId the conversation ID to get a token for
 */
public record TokenRequest(
        @NotNull UUID conversationId
) {}
