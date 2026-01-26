package com.notificationservice.websocket.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Event sent to reps when a new connection request is received.
 */
public record RequestReceivedEvent(
        UUID requestId,
        UUID visitorId,
        String visitorName,
        String direction,
        OffsetDateTime expiresAt
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "request_received";
    }
}