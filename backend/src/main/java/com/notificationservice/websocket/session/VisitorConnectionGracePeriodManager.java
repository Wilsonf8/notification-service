package com.notificationservice.websocket.session;

import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.VisitorUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Manages a short grace period for WebSocket disconnection broadcasts.
 * Delays the VisitorUpdatedEvent(isConnected=false) broadcast by 3 seconds to smooth
 * out normal page navigation/refresh scenarios where visitors briefly disconnect.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VisitorConnectionGracePeriodManager {

    private static final int CONNECTION_GRACE_PERIOD_SECONDS = 3;

    private final WebSocketBroadcaster broadcaster;
    private final ScheduledExecutorService scheduler =
            Executors.newSingleThreadScheduledExecutor();
    private final ConcurrentHashMap<UUID, ScheduledFuture<?>> pendingDisconnections =
            new ConcurrentHashMap<>();

    /**
     * Schedules a delayed disconnection broadcast for a visitor.
     * If the visitor reconnects within the grace period, the broadcast can be cancelled.
     *
     * @param visitorId the visitor's internal ID
     * @param projectId the project ID to broadcast to
     * @param event the VisitorUpdatedEvent to broadcast after the grace period
     */
    public void scheduleDisconnectionBroadcast(UUID visitorId, UUID projectId,
            VisitorUpdatedEvent event) {
        // Cancel any existing pending disconnection first
        cancelPendingDisconnection(visitorId);

        ScheduledFuture<?> future = scheduler.schedule(() -> {
            pendingDisconnections.remove(visitorId);
            broadcaster.broadcastToProject(projectId, event);
            log.info("[GracePeriod] Disconnection broadcast after grace period: visitorId={}",
                    visitorId);
        }, CONNECTION_GRACE_PERIOD_SECONDS, TimeUnit.SECONDS);

        pendingDisconnections.put(visitorId, future);
        log.debug("[GracePeriod] Scheduled disconnection broadcast for visitorId={} in {}s",
                visitorId, CONNECTION_GRACE_PERIOD_SECONDS);
    }

    /**
     * Cancels a pending disconnection broadcast for a visitor.
     * Should be called when a visitor reconnects within the grace period.
     *
     * @param visitorId the visitor's internal ID
     */
    public void cancelPendingDisconnection(UUID visitorId) {
        ScheduledFuture<?> future = pendingDisconnections.remove(visitorId);
        if (future != null && !future.isDone()) {
            future.cancel(false);
            log.debug("[GracePeriod] Cancelled pending disconnection: visitorId={}", visitorId);
        }
    }
}
