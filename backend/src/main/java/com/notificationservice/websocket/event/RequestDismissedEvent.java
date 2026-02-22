package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event sent to the dismissing rep when they dismiss a request.
 * Not broadcast to other reps — only the dismissing rep receives this.
 */
public record RequestDismissedEvent(
        UUID requestId
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "request_dismissed";
    }
}
