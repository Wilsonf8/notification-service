package com.notificationservice.dto;

import com.notificationservice.entity.EventStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventDto(
        UUID id,
        String text,
        String topic,
        EventStatus status,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime sentAt
) {}
