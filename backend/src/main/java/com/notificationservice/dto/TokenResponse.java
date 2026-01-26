package com.notificationservice.dto;

/**
 * Response containing a LiveKit token for joining a room.
 *
 * @param token the LiveKit JWT access token
 * @param roomName the LiveKit room name
 * @param url the LiveKit WebSocket URL
 */
public record TokenResponse(
        String token,
        String roomName,
        String url
) {}
