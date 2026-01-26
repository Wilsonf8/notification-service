package com.notificationservice.dto;

import java.util.UUID;

/**
 * Response DTO for accepting a request.
 * Contains conversation details for starting the call.
 *
 * @param conversationId the created conversation ID
 * @param roomName the LiveKit room name (placeholder for now)
 * @param token the LiveKit token for joining (placeholder for now)
 */
public record AcceptRequestResponse(
        UUID conversationId,
        String roomName,
        String token
) {}
