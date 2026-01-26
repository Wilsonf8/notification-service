package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for LiveConnect embed keys.
 * Shows key prefix only (not full key) for security.
 *
 * @param id the embed key ID
 * @param name the embed key name
 * @param keyPrefix first 12 characters of the key (e.g., "lck_abc12345")
 * @param allowedDomains list of domains allowed to use this key
 * @param createdAt when the key was created
 * @param lastUsedAt when the key was last used
 */
public record LiveConnectEmbedKeyDto(
        UUID id,
        String name,
        String keyPrefix,
        List<String> allowedDomains,
        OffsetDateTime createdAt,
        OffsetDateTime lastUsedAt
) {}
