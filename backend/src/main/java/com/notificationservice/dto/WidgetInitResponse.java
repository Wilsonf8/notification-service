package com.notificationservice.dto;

/**
 * Response DTO for widget initialization.
 *
 * @param sessionToken the session token for subsequent authenticated requests
 * @param welcomeMessage the configured welcome message
 * @param widgetColor the configured widget color (hex)
 * @param widgetPosition the configured widget position (bottom-right or bottom-left)
 * @param pendingRequest pending call request info if one exists, null otherwise
 * @param repsAvailable whether any reps are available to take calls
 */
public record WidgetInitResponse(
        String sessionToken,
        String welcomeMessage,
        String widgetColor,
        String widgetPosition,
        PendingRequestInfo pendingRequest,
        boolean repsAvailable
) {}