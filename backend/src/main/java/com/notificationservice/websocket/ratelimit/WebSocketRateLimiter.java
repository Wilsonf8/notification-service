package com.notificationservice.websocket.ratelimit;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-connection rate limiter for WebSocket messages.
 * Uses a sliding window counter to limit messages per second per session.
 */
@Component
public class WebSocketRateLimiter {

    private static final int MAX_MESSAGES_PER_WINDOW = 30;
    private static final long WINDOW_MS = 10_000; // 10-second window

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    /**
     * Checks if a message from the given session should be allowed.
     *
     * @param sessionId the WebSocket session ID
     * @return true if the message is allowed, false if rate-limited
     */
    public boolean allowMessage(String sessionId) {
        WindowCounter counter = counters.computeIfAbsent(sessionId, k -> new WindowCounter());
        return counter.tryAcquire();
    }

    /**
     * Removes the counter for a closed session to prevent memory leaks.
     *
     * @param sessionId the WebSocket session ID
     */
    public void removeSession(String sessionId) {
        counters.remove(sessionId);
    }

    private static class WindowCounter {
        private long windowStart;
        private int count;

        WindowCounter() {
            this.windowStart = System.currentTimeMillis();
            this.count = 0;
        }

        synchronized boolean tryAcquire() {
            long now = System.currentTimeMillis();
            if (now - windowStart > WINDOW_MS) {
                windowStart = now;
                count = 0;
            }
            if (count >= MAX_MESSAGES_PER_WINDOW) {
                return false;
            }
            count++;
            return true;
        }
    }
}
