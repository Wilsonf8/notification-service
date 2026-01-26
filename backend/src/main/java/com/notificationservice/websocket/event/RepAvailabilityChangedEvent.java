package com.notificationservice.websocket.event;

/**
 * Event sent to visitors when rep availability for a project changes.
 */
public record RepAvailabilityChangedEvent(
        boolean repsAvailable
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "rep_availability_changed";
    }
}
