package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to a rep when a conversation is started.
 */
public record ConversationStartedEvent(
        UUID conversationId,
        UUID visitorId,
        String roomName,
        String token
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
