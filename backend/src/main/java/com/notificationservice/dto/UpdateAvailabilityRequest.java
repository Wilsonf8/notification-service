package com.notificationservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Request DTO for updating a rep's availability status.
 *
 * @param availability the new availability status (available or unavailable)
 */
public record UpdateAvailabilityRequest(
        @NotNull(message = "Availability is required")
        @Pattern(regexp = "^(available|unavailable)$", message = "Availability must be 'available' or 'unavailable'")
        String availability
) {}
