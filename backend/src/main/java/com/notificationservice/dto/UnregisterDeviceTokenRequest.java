package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for unregistering a device token.
 *
 * @param token the APNs device token to remove
 */
public record UnregisterDeviceTokenRequest(
        @NotBlank String token
) {}
