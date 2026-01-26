package com.notificationservice.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating LiveConnect project settings.
 *
 * @param welcomeMessage the welcome message shown to visitors
 * @param offlineMessage the message shown when no reps are available
 * @param widgetColor the widget theme color (hex format, e.g., #FACC15)
 * @param widgetPosition the widget position on the page (bottom-right or bottom-left)
 * @param isActive whether the widget is active
 */
public record UpdateLiveConnectSettingsRequest(
        @Size(max = 500) String welcomeMessage,
        @Size(max = 500) String offlineMessage,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color (e.g., #FACC15)") String widgetColor,
        @Pattern(regexp = "^(bottom-right|bottom-left)$", message = "Must be bottom-right or bottom-left") String widgetPosition,
        Boolean isActive
) {}
