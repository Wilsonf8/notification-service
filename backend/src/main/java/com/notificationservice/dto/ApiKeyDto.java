package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ApiKeyDto(
        UUID id,
        String name,
        String keyPrefix,
        OffsetDateTime createdAt,
        OffsetDateTime lastUsedAt
) {}
