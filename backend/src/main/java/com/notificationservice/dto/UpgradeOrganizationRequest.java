package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for upgrading a personal organization to a paid team organization.
 *
 * @param name the new organization name (must differ from current)
 * @param priceId the Stripe price ID
 */
public record UpgradeOrganizationRequest(
        @NotBlank String name,
        @NotBlank String priceId
) {}
