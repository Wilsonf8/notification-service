package com.notificationservice.service;

import com.notificationservice.config.LiveKitProperties;
import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Service for generating LiveKit access tokens.
 */
@Service
@RequiredArgsConstructor
public class LiveKitTokenService {

    private final LiveKitProperties properties;

    /**
     * Generates a LiveKit access token for a participant.
     *
     * @param roomName the name of the room to join
     * @param participantIdentity unique identifier for the participant
     * @param participantName display name for the participant
     * @return JWT token string
     */
    public String generateToken(String roomName, String participantIdentity, String participantName) {
        AccessToken token = new AccessToken(properties.apiKey(), properties.apiSecret());
        token.setIdentity(participantIdentity);
        token.setName(participantName);
        token.setTtl(Duration.ofHours(properties.tokenTtlHours()).toMillis());
        token.addGrants(new RoomJoin(true), new RoomName(roomName));
        return token.toJwt();
    }

    /**
     * Generates a room name from a conversation ID.
     *
     * @param conversationId the conversation UUID
     * @return room name in format "conv_{conversationId}"
     */
    public String generateRoomName(UUID conversationId) {
        return "conv_" + conversationId.toString();
    }

    /**
     * Returns the LiveKit WebSocket URL for client connections.
     *
     * @return the LiveKit server URL
     */
    public String getLiveKitUrl() {
        return properties.url();
    }
}
