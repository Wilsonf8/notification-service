package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event broadcast to all reps when a call ends.
 * Used to remove the call from the "In Call" section on dashboards.
 *
 * @param conversationId the conversation ID
 */
public record CallEndedBroadcastEvent(
        UUID conversationId
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "call_ended_broadcast";
    }
}
