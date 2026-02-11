package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for registering a device token for push notifications.
 *
 * @param token the APNs device token
 * @param bundleId the app bundle identifier
 */
public record RegisterDeviceTokenRequest(
        @NotBlank String token,
        @NotBlank String bundleId
) {}
