package com.notificationservice.dto;

import java.util.List;

/**
 * Response DTO for the visitor list endpoint.
 * Contains visitors currently browsing and requests in the queue.
 *
 * @param browsing visitors currently online without active requests
 * @param queue pending requests from visitors wanting to connect
 */
public record VisitorListResponse(
        List<LiveConnectVisitorDto> browsing,
        List<LiveConnectRequestDto> queue
) {}
