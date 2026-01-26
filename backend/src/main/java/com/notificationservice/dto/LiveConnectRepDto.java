package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for a LiveConnect rep.
 *
 * @param id the rep record ID
 * @param userId the user's ID
 * @param name the user's display name
 * @param email the user's email
 * @param availability the rep's availability status (AVAILABLE, UNAVAILABLE)
 * @param presence the rep's presence status (ONLINE, OFFLINE, IN_CALL)
 * @param createdAt when the rep was added to the project
 */
public record LiveConnectRepDto(
        UUID id,
        UUID userId,
        String name,
        String email,
        String availability,
        String presence,
        OffsetDateTime createdAt
) {}
