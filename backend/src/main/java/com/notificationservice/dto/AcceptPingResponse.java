package com.notificationservice.dto;

import java.util.UUID;

/**
 * Response DTO for accepting a rep's ping.
 * Contains everything needed to join the video call.
 *
 * @param conversationId the created conversation ID
 * @param roomName the LiveKit room name
 * @param token the LiveKit JWT token for the visitor
 * @param liveKitUrl the LiveKit WebSocket URL
 */
public record AcceptPingResponse(
        UUID conversationId,
        String roomName,
        String token,
        String liveKitUrl
) {}
