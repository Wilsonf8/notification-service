package com.notificationservice.dto;

import java.util.UUID;

public record ApiKeyCreatedDto(
        UUID id,
        String name,
        String key  // Full key, shown only once
) {}
