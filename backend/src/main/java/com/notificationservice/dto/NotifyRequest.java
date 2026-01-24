package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotifyRequest(
        @NotBlank @Size(max = 4000) String text,
        @Size(max = 100) String topic,
        @Size(max = 255) String idempotencyKey
) {}
