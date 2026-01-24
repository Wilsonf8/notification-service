package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating an organization.
 *
 * @param name the new display name for the organization
 */
public record UpdateOrganizationRequest(
        @NotBlank(message = "Organization name is required")
        @Size(min = 2, max = 100, message = "Organization name must be between 2 and 100 characters")
        @Pattern(regexp = "^[a-zA-Z0-9][a-zA-Z0-9\\s\\-_]*$",
                 message = "Organization name must start with a letter or number and can only contain letters, numbers, spaces, hyphens, and underscores")
        String name
) {}
