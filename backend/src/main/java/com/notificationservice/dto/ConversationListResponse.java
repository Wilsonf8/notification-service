package com.notificationservice.dto;

import java.util.List;

/**
 * Paginated response for listing conversations.
 *
 * @param conversations the list of conversations
 * @param page the current page number (0-indexed)
 * @param size the page size
 * @param totalElements the total number of conversations
 * @param totalPages the total number of pages
 */
public record ConversationListResponse(
        List<LiveConnectConversationDto> conversations,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
