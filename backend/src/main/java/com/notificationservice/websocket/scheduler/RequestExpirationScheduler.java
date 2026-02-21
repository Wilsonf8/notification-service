package com.notificationservice.websocket.scheduler;

import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.RequestStatus;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.RequestExpiredEvent;
import com.notificationservice.websocket.session.VisitorSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Scheduler that checks for expired requests and notifies both reps and visitors.
 * Runs every 5 seconds to ensure timely expiration handling.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RequestExpirationScheduler {

    private final LiveConnectRequestRepository requestRepository;
    private final WebSocketBroadcaster broadcaster;
    private final VisitorSessionManager visitorSessionManager;

    /**
     * Checks for expired pending requests every 5 seconds.
     * Marks them as expired and notifies both reps and visitors.
     */
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void checkExpiredRequests() {
        OffsetDateTime now = OffsetDateTime.now();

        // Load expired requests first (need IDs/relationships for broadcasting)
        List<LiveConnectRequest> expiredRequests =
                requestRepository.findByStatusAndExpiresAtBefore(RequestStatus.PENDING, now);

        if (expiredRequests.isEmpty()) {
            return;
        }

        // Bulk update all expired requests in a single UPDATE statement
        requestRepository.expirePendingRequests(now);

        // Broadcast and update state for each expired request
        for (LiveConnectRequest request : expiredRequests) {
            RequestExpiredEvent event = new RequestExpiredEvent(request.getId());
            broadcaster.broadcastToProject(request.getProject().getId(), event);
            broadcaster.sendToVisitor(request.getVisitor().getId(), event);
            visitorSessionManager.setVisitorState(request.getVisitor().getId(), VisitorSessionManager.VisitorEngagementState.BROWSING);

            log.info("Request expired: requestId={}, visitorId={}, projectId={}",
                    request.getId(),
                    request.getVisitor().getId(),
                    request.getProject().getId());
        }

        log.debug("Processed {} expired requests", expiredRequests.size());
    }
}
