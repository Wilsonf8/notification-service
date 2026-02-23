package com.notificationservice.dto;

import java.util.List;

/**
 * Paginated response for the CRM visitor list.
 *
 * @param visitors list of visitors for the current page
 * @param totalElements total number of matching visitors
 * @param totalPages total number of pages
 * @param page current page number (0-indexed)
 * @param size page size
 */
public record CrmVisitorListResponse(
        List<CrmVisitorListItemDto> visitors,
        long totalElements,
        int totalPages,
        int page,
        int size
) {}
