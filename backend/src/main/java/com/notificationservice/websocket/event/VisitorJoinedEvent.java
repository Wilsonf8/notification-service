package com.notificationservice.websocket.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Event sent to reps when a visitor connects to the widget.
 */
public record VisitorJoinedEvent(
        UUID visitorId,
        String name,
        String email,
        String currentPage,
        OffsetDateTime joinedAt,
        boolean isFirstVisit,
        OffsetDateTime previousVisitEndedAt,
        int totalVisitCount,
        String countryCode,
        String country,
        String city,
        String browserName,
        String osName,
        String deviceType
) {
    /**
     * Returns the event type identifier.
     *
     * @return the event type string
     */
    public String getType() {
        return "visitor_joined";
    }
}
