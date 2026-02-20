package com.notificationservice.dto;

/**
 * Response DTO for LiveConnect project settings.
 *
 * @param welcomeMessage the welcome message shown to visitors
 * @param offlineMessage the message shown when no reps are available
 * @param widgetColor the widget theme color (hex format)
 * @param widgetPosition the widget position on the page
 * @param isActive whether the widget is active
 * @param backgroundColor the widget panel background color (hex format)
 * @param textColor the widget text color (hex format)
 * @param borderRadius the widget corner rounding in pixels
 * @param fontFamily the widget font family
 * @param widgetIcon the widget FAB button icon name
 */
public record LiveConnectSettingsDto(
        String welcomeMessage,
        String offlineMessage,
        String widgetColor,
        String widgetPosition,
        Boolean isActive,
        String backgroundColor,
        String textColor,
        Integer borderRadius,
        String fontFamily,
        String widgetIcon
) {}
