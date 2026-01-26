package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to reps when a visitor's state changes (e.g., page navigation).
 */
public record VisitorUpdatedEvent(
        UUID visitorId,
        String currentPage
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "visitor_updated";
    }
}