package com.notificationservice.dto;

import java.util.List;

/**
 * Response DTO for the visitor list endpoint.
 * Contains visitors currently browsing, requests in the queue, and active calls.
 *
 * @param browsing visitors currently online without active requests
 * @param queue pending requests from visitors wanting to connect
 * @param inCall active calls currently in progress
 */
public record VisitorListResponse(
        List<LiveConnectVisitorDto> browsing,
        List<LiveConnectRequestDto> queue,
        List<ActiveCallDto> inCall
) {}
