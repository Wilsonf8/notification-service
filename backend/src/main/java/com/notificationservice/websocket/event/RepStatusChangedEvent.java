package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event broadcast to all reps in a project when any rep's status changes.
 * Carries the full rep state so iOS clients can update their UI in real-time.
 */
public record RepStatusChangedEvent(
        UUID id,
        UUID userId,
        String name,
        String email,
        String availability,
        String presence
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "rep_status_changed";
    }
}
