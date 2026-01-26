package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to both reps and visitors when a call/conversation ends.
 */
public record CallEndedEvent(
        UUID conversationId,
        Integer durationSeconds
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "call_ended";
    }
}
