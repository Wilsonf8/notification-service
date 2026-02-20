package com.notificationservice.dto;

import java.util.UUID;

/**
 * Response DTO for user search results.
 *
 * @param id the user's unique identifier
 * @param username the user's username
 * @param firstName the user's first name
 * @param lastName the user's last name
 * @param email the user's email address
 * @param avatarUrl the user's avatar URL
 */
public record UserSearchResultDto(
        UUID id,
        String username,
        String firstName,
        String lastName,
        String email,
        String avatarUrl
) {}
