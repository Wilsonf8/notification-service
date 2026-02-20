package com.notificationservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating LiveConnect project settings.
 *
 * @param welcomeMessage the welcome message shown to visitors
 * @param offlineMessage the message shown when no reps are available
 * @param widgetColor the widget theme color (hex format, e.g., #FACC15)
 * @param widgetPosition the widget position on the page
 * @param isActive whether the widget is active
 * @param backgroundColor the widget panel background color (hex format)
 * @param textColor the widget text color (hex format)
 * @param borderRadius the widget corner rounding in pixels (0-24)
 * @param fontFamily the widget font family
 */
public record UpdateLiveConnectSettingsRequest(
        @Size(max = 500) String welcomeMessage,
        @Size(max = 500) String offlineMessage,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color (e.g., #FACC15)") String widgetColor,
        @Pattern(regexp = "^(bottom-right|bottom-left|top-right|top-left)$", message = "Must be bottom-right, bottom-left, top-right, or top-left") String widgetPosition,
        Boolean isActive,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color (e.g., #0c0a09)") String backgroundColor,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color (e.g., #fafaf9)") String textColor,
        @Min(0) @Max(24) Integer borderRadius,
        @Pattern(regexp = "^(JetBrains Mono|Inter|DM Sans|Nunito|System Default)$", message = "Must be a supported font family") String fontFamily
) {}
