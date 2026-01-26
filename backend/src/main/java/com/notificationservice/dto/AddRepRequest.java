package com.notificationservice.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request DTO for adding a user as a rep to a project.
 *
 * @param userId the user ID to add as a rep
 */
public record AddRepRequest(
        @NotNull(message = "User ID is required")
        UUID userId
) {}
