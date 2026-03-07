package com.notificationservice.dto;

/**
 * Request DTO for updating user profile information.
 *
 * @param firstName the user's first name (nullable, max 50 characters)
 * @param lastName the user's last name (nullable, max 50 characters)
 */
public record UpdateProfileRequest(
        String firstName,
        String lastName
) {}
