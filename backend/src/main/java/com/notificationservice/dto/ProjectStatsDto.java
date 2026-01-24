package com.notificationservice.dto;

public record ProjectStatsDto(
        long todayTotal,
        long todaySent,
        long todayFailed,
        long weekTotal,
        long weekSent,
        long weekFailed,
        long monthTotal,
        long monthSent,
        long monthFailed,
        double successRate
) {}
