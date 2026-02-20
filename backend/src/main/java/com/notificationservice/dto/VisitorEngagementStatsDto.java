package com.notificationservice.dto;

/**
 * DTO for visitor engagement statistics across multiple time windows.
 *
 * @param pingsReceived24h number of pings (REP_TO_USER) in the last 24 hours
 * @param pingsReceived3d  number of pings in the last 3 days
 * @param pingsReceived7d  number of pings in the last 7 days
 * @param requestsSent24h  number of requests (USER_TO_REPS) in the last 24 hours
 * @param requestsSent3d   number of requests in the last 3 days
 * @param requestsSent7d   number of requests in the last 7 days
 * @param callsJoined24h   number of video calls in the last 24 hours
 * @param callsJoined3d    number of video calls in the last 3 days
 * @param callsJoined7d    number of video calls in the last 7 days
 */
public record VisitorEngagementStatsDto(
        long pingsReceived24h,
        long pingsReceived3d,
        long pingsReceived7d,
        long requestsSent24h,
        long requestsSent3d,
        long requestsSent7d,
        long callsJoined24h,
        long callsJoined3d,
        long callsJoined7d
) {}
