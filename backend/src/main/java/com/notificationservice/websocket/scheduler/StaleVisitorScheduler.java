package com.notificationservice.websocket.scheduler;

import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.service.LiveConnectVisitService;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.VisitorLeftEvent;
import com.notificationservice.websocket.session.VisitorSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Scheduler that detects visitors whose heartbeat has gone stale.
 * Catches silent WebSocket deaths (e.g., mobile browser backgrounded, network loss)
 * that the grace period scheduler cannot detect because they never received a
 * proper WebSocket close event.
 * <p>
 * Runs every 60 seconds with a 120-second staleness threshold (~8 missed heartbeats at 15s).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StaleVisitorScheduler {

    private static final int STALE_THRESHOLD_SECONDS = 120;

    private final LiveConnectVisitorRepository visitorRepository;
    private final LiveConnectVisitService visitService;
    private final VisitorSessionManager visitorSessionManager;
    private final WebSocketBroadcaster broadcaster;

    /**
     * Checks for stale visitors every 60 seconds.
     * A visitor is stale if they have activeConnections > 0 but lastSeenAt
     * is older than 120 seconds (meaning heartbeats stopped arriving).
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void checkStaleVisitors() {
        OffsetDateTime threshold = OffsetDateTime.now().minusSeconds(STALE_THRESHOLD_SECONDS);
        List<LiveConnectVisitor> staleVisitors =
                visitorRepository.findStaleOnlineVisitors(threshold);

        if (staleVisitors.isEmpty()) {
            return;
        }

        for (LiveConnectVisitor visitor : staleVisitors) {
            // Close the open visit record so reconnection creates a new visit
            visitService.recordDisconnection(visitor.getId());

            // Mark as disconnected
            visitor.setActiveConnections(0);
            visitor.setDisconnectedAt(null); // Skip grace period — already stale
            visitorRepository.save(visitor);

            // Clean up in-memory session state
            visitorSessionManager.removeVisitorState(visitor.getId());

            // Broadcast visitor_left to reps
            VisitorLeftEvent event = new VisitorLeftEvent(
                    visitor.getId(),
                    OffsetDateTime.now()
            );
            broadcaster.broadcastToProject(visitor.getProject().getId(), event);

            log.info("Stale visitor detected and removed: visitorId={}, projectId={}, lastSeenAt={}",
                    visitor.getId(), visitor.getProject().getId(), visitor.getLastSeenAt());
        }

        log.debug("Processed {} stale visitors", staleVisitors.size());
    }
}
