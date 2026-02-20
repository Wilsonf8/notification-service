package com.notificationservice.dto;

/**
 * Response DTO for widget initialization.
 *
 * @param sessionToken the session token for subsequent authenticated requests
 * @param welcomeMessage the configured welcome message
 * @param widgetColor the configured widget color (hex)
 * @param widgetPosition the configured widget position
 * @param pendingRequest pending call request info if one exists, null otherwise
 * @param repsAvailable whether any reps are available to take calls
 * @param backgroundColor the widget panel background color (hex)
 * @param textColor the widget text color (hex)
 * @param borderRadius the widget corner rounding in pixels
 * @param fontFamily the widget font family
 */
public record WidgetInitResponse(
        String sessionToken,
        String welcomeMessage,
        String widgetColor,
        String widgetPosition,
        PendingRequestInfo pendingRequest,
        boolean repsAvailable,
        String backgroundColor,
        String textColor,
        Integer borderRadius,
        String fontFamily
) {}