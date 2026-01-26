package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to a visitor when a ping request expires.
 */
public record PingExpiredEvent(
        UUID requestId
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "ping_expired";
    }
}
