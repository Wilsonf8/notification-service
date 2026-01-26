package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for newly created LiveConnect embed keys.
 * Includes full key (only shown once on creation).
 *
 * @param id the embed key ID
 * @param name the embed key name
 * @param key the full embed key (only shown once)
 * @param allowedDomains list of domains allowed to use this key
 * @param createdAt when the key was created
 */
public record LiveConnectEmbedKeyCreatedDto(
        UUID id,
        String name,
        String key,
        List<String> allowedDomains,
        OffsetDateTime createdAt
) {}
