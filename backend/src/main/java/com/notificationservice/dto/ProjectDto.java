package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjectDto(
        UUID id,
        String name,
        String description,
        TelegramDestinationDto telegramDestination,
        OffsetDateTime createdAt
) {}
