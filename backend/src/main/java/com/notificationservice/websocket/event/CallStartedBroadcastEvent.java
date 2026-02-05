package com.notificationservice.websocket.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Event broadcast to all reps when a call starts.
 * Used to update the "In Call" section on dashboards.
 *
 * @param conversationId the conversation ID
 * @param visitorId the visitor's internal ID
 * @param visitorName the visitor's display name
 * @param repId the rep's internal ID
 * @param repUserId the rep's user ID
 * @param repName the rep's display name
 * @param startedAt when the call started
 */
public record CallStartedBroadcastEvent(
        UUID conversationId,
        UUID visitorId,
        String visitorName,
        UUID repId,
        UUID repUserId,
        String repName,
        OffsetDateTime startedAt
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "call_started_broadcast";
    }
}
