package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to both reps and visitors when a request expires.
 */
public record RequestExpiredEvent(
        UUID requestId
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "request_expired";
    }
}
