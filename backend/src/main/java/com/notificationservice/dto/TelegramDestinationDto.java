package com.notificationservice.dto;

public record TelegramDestinationDto(
        String username,
        boolean isEnabled,
        String disabledReason,
        HealthStatus healthStatus
) {
    public enum HealthStatus {
        HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN
    }
}
