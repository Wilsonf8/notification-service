package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to a visitor when a call is about to start.
 */
public record CallStartingEvent(
        UUID conversationId,
        String roomName,
        String token
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "call_starting";
    }
}
