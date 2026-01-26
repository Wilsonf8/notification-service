package com.notificationservice.websocket.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Event sent to both reps and visitors when a message is received in a conversation.
 */
public record MessageReceivedEvent(
        UUID conversationId,
        UUID messageId,
        String senderType,
        String senderName,
        String content,
        OffsetDateTime sentAt
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "message_received";
    }
}
