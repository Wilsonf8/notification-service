package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to a visitor when a pending ping is withdrawn
 * because the rep entered a call with another visitor.
 */
public record PingWithdrawnEvent(
        UUID requestId
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "ping_withdrawn";
    }
}
