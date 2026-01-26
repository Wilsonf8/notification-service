package com.notificationservice.websocket.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Event sent to reps when a visitor disconnects from the widget after the grace period.
 */
public record VisitorLeftEvent(
        UUID visitorId,
        OffsetDateTime leftAt
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "visitor_left";
    }
}