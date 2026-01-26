package com.notificationservice.dto;

/**
 * Response DTO for LiveConnect project settings.
 *
 * @param welcomeMessage the welcome message shown to visitors
 * @param offlineMessage the message shown when no reps are available
 * @param widgetColor the widget theme color (hex format)
 * @param widgetPosition the widget position on the page
 * @param isActive whether the widget is active
 */
public record LiveConnectSettingsDto(
        String welcomeMessage,
        String offlineMessage,
        String widgetColor,
        String widgetPosition,
        Boolean isActive
) {}
