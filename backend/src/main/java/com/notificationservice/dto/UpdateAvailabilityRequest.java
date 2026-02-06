package com.notificationservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Request DTO for updating a rep's availability status.
 *
 * @param availability the new availability status (AVAILABLE or UNAVAILABLE)
 */
public record UpdateAvailabilityRequest(
        @NotNull(message = "Availability is required")
        @Pattern(regexp = "^(AVAILABLE|UNAVAILABLE|available|unavailable)$", message = "Availability must be 'AVAILABLE' or 'UNAVAILABLE'")
        String availability
) {}
