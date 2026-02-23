package com.notificationservice.websocket.event;

import java.util.UUID;

/**
 * Event broadcast to all reps when a request is accepted.
 * Allows other reps to immediately remove the request from their queue
 * without waiting for the call_started_broadcast event.
 *
 * @param requestId the accepted request ID
 * @param repId the rep's internal ID who accepted
 * @param repName the rep's display name who accepted
 */
public record RequestAcceptedByOtherEvent(
        UUID requestId,
        UUID repId,
        String repName
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "request_accepted_by_other";
    }
}
