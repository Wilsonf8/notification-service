package com.notificationservice.dto;

import java.util.List;

/**
 * Paginated response for listing messages.
 *
 * @param messages the list of messages
 * @param page the current page number (0-indexed)
 * @param size the page size
 * @param totalElements the total number of messages
 * @param totalPages the total number of pages
 */
public record MessageListResponse(
        List<LiveConnectMessageDto> messages,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
