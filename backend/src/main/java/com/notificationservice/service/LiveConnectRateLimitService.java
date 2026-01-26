package com.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Rate limiting service for LiveConnect widget endpoints.
 * Implements dual-layer rate limiting: per-visitor and per-IP backstop.
 */
@Service
@RequiredArgsConstructor
public class LiveConnectRateLimitService {

    private final StringRedisTemplate redisTemplate;

    // Per-visitor limits
    @Value("${app.liveconnect.rate-limit.visitor.in-call-message-per-min}")
    private int visitorInCallMessagePerMin;

    @Value("${app.liveconnect.rate-limit.visitor.request-call-per-min}")
    private int visitorRequestCallPerMin;

    @Value("${app.liveconnect.rate-limit.visitor.leave-contact-per-hour}")
    private int visitorLeaveContactPerHour;

    // Per-IP limits (backstop)
    @Value("${app.liveconnect.rate-limit.ip.widget-init-per-min}")
    private int ipWidgetInitPerMin;

    @Value("${app.liveconnect.rate-limit.ip.in-call-message-per-min}")
    private int ipInCallMessagePerMin;

    @Value("${app.liveconnect.rate-limit.ip.request-call-per-min}")
    private int ipRequestCallPerMin;

    @Value("${app.liveconnect.rate-limit.ip.leave-contact-per-hour}")
    private int ipLeaveContactPerHour;

    /**
     * Check rate limit for widget initialization (IP only).
     *
     * @param clientIp the client IP address
     * @throws RateLimitExceededException if rate limit is exceeded
     */
    public void checkWidgetInit(String clientIp) {
        checkLimit("lc:init:ip:" + clientIp, ipWidgetInitPerMin, 60, TimeUnit.SECONDS,
                "Widget init rate limit exceeded");
    }

    /**
     * Check rate limit for in-call messages (visitor + IP backstop).
     *
     * @param visitorId the visitor identifier
     * @param clientIp the client IP address
     * @throws RateLimitExceededException if rate limit is exceeded
     */
    public void checkInCallMessage(String visitorId, String clientIp) {
        checkLimit("lc:msg:visitor:" + visitorId, visitorInCallMessagePerMin, 60, TimeUnit.SECONDS,
                "Message rate limit exceeded");
        checkLimit("lc:msg:ip:" + clientIp, ipInCallMessagePerMin, 60, TimeUnit.SECONDS,
                "Message rate limit exceeded");
    }

    /**
     * Check rate limit for call requests (visitor + IP backstop).
     *
     * @param visitorId the visitor identifier
     * @param clientIp the client IP address
     * @throws RateLimitExceededException if rate limit is exceeded
     */
    public void checkRequestCall(String visitorId, String clientIp) {
        checkLimit("lc:reqcall:visitor:" + visitorId, visitorRequestCallPerMin, 60, TimeUnit.SECONDS,
                "Call request rate limit exceeded");
        checkLimit("lc:reqcall:ip:" + clientIp, ipRequestCallPerMin, 60, TimeUnit.SECONDS,
                "Call request rate limit exceeded");
    }

    /**
     * Check rate limit for leaving contact info (visitor + IP backstop).
     *
     * @param visitorId the visitor identifier
     * @param clientIp the client IP address
     * @throws RateLimitExceededException if rate limit is exceeded
     */
    public void checkLeaveContact(String visitorId, String clientIp) {
        checkLimit("lc:contact:visitor:" + visitorId, visitorLeaveContactPerHour, 1, TimeUnit.HOURS,
                "Contact form rate limit exceeded");
        checkLimit("lc:contact:ip:" + clientIp, ipLeaveContactPerHour, 1, TimeUnit.HOURS,
                "Contact form rate limit exceeded");
    }

    private void checkLimit(String key, int limit, long duration, TimeUnit unit, String message) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, duration, unit);
        }
        if (count != null && count > limit) {
            throw new RateLimitExceededException(message);
        }
    }
}