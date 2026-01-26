package com.notificationservice.websocket.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Event sent to a visitor when a rep pings them.
 */
public record IncomingPingEvent(
        UUID requestId,
        String repName,
        OffsetDateTime expiresAt
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "incoming_ping";
    }
}
