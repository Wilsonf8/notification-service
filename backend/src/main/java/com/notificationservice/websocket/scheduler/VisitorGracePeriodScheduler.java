package com.notificationservice.websocket.scheduler;

import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.VisitorLeftEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Scheduler that checks for visitors who have exceeded the grace period
 * after disconnecting, and broadcasts visitor_left events to reps.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VisitorGracePeriodScheduler {

    private static final int GRACE_PERIOD_SECONDS = 30;

    private final LiveConnectVisitorRepository visitorRepository;
    private final WebSocketBroadcaster broadcaster;

    /**
     * Checks for disconnected visitors past the grace period every 10 seconds.
     */
    @Scheduled(fixedRate = 10000)
    @Transactional
    public void checkGracePeriod() {
        OffsetDateTime threshold = OffsetDateTime.now().minusSeconds(GRACE_PERIOD_SECONDS);
        List<LiveConnectVisitor> staleVisitors =
                visitorRepository.findByActiveConnectionsAndDisconnectedAtBefore(0, threshold);

        for (LiveConnectVisitor visitor : staleVisitors) {
            VisitorLeftEvent event = new VisitorLeftEvent(
                    visitor.getId(),
                    OffsetDateTime.now()
            );

            broadcaster.broadcastToProject(visitor.getProject().getId(), event);

            // Clear disconnectedAt to prevent re-broadcast
            visitor.setDisconnectedAt(null);
            visitorRepository.save(visitor);

            log.info("Visitor left after grace period: visitorId={}, projectId={}",
                    visitor.getId(), visitor.getProject().getId());
        }

        if (!staleVisitors.isEmpty()) {
            log.debug("Processed {} visitors past grace period", staleVisitors.size());
        }
    }
}