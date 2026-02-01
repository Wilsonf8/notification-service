package com.notificationservice.dto;

import java.util.UUID;

/**
 * Response DTO for accepting a request.
 * Contains conversation details for starting the call.
 *
 * @param conversationId the created conversation ID
 * @param roomName the LiveKit room name
 * @param token the LiveKit token for joining
 * @param liveKitUrl the LiveKit WebSocket URL for client connections
 */
public record AcceptRequestResponse(
        UUID conversationId,
        String roomName,
        String token,
        String liveKitUrl
) {}
