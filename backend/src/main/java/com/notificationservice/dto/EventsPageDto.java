package com.notificationservice.dto;

import java.util.List;

public record EventsPageDto(
        List<EventDto> events,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
