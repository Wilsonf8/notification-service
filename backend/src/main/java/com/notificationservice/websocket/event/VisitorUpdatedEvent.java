package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to reps when a visitor's state changes (e.g., page navigation, disconnect).
 */
public record VisitorUpdatedEvent(
        UUID visitorId,
        String name,
        String email,
        String currentPage,
        String currentPageTitle,
        Boolean isConnected
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