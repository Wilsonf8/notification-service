package com.notificationservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for LiveKit integration.
 *
 * @param apiKey the LiveKit API key
 * @param apiSecret the LiveKit API secret
 * @param url the LiveKit server WebSocket URL
 * @param tokenTtlHours the token time-to-live in hours
 */
@ConfigurationProperties(prefix = "app.livekit")
public record LiveKitProperties(
        String apiKey,
        String apiSecret,
        String url,
        int tokenTtlHours
) {}
