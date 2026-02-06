package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event broadcast when a visitor cancels their pending request.
 */
public record RequestCancelledEvent(
        UUID requestId
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "request_cancelled";
    }
}
