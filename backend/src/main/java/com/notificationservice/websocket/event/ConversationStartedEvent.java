package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to a rep when a conversation is started.
 *
 * @param conversationId the conversation UUID
 * @param visitorId the visitor UUID
 * @param roomName the LiveKit room name
 * @param token the LiveKit token for the rep
 * @param liveKitUrl the LiveKit server URL
 * @param originDeviceSessionId the device session that triggered the accept (null for visitor-initiated calls)
 */
public record ConversationStartedEvent(
        UUID conversationId,
        UUID visitorId,
        String roomName,
        String token,
        String liveKitUrl,
        String originDeviceSessionId
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "conversation_started";
    }
}
