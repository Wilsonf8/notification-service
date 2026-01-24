package com.notificationservice.dto;

import java.util.UUID;

public record NotifyResponse(
        UUID eventId,
        String status
) {}
