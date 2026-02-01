package com.notificationservice.websocket.scheduler;

import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.RequestStatus;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.RequestExpiredEvent;
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

    /**
     * Checks for expired pending requests every 5 seconds.
     * Marks them as expired and notifies both reps and visitors.
     */
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void checkExpiredRequests() {
        OffsetDateTime now = OffsetDateTime.now();
        List<LiveConnectRequest> expiredRequests =
                requestRepository.findByStatusAndExpiresAtBefore(RequestStatus.PENDING, now);

        for (LiveConnectRequest request : expiredRequests) {
            // Mark as expired
            request.setStatus(RequestStatus.EXPIRED);
            requestRepository.save(request);

            // Notify reps that the request expired
            RequestExpiredEvent event = new RequestExpiredEvent(request.getId());
            broadcaster.broadcastToProject(request.getProject().getId(), event);

            // Notify the visitor that their request expired (same event, visitor widget handles it)
            broadcaster.sendToVisitor(request.getVisitor().getId(), event);

            log.info("Request expired: requestId={}, visitorId={}, projectId={}",
                    request.getId(),
                    request.getVisitor().getId(),
                    request.getProject().getId());
        }

        if (!expiredRequests.isEmpty()) {
            log.debug("Processed {} expired requests", expiredRequests.size());
        }
    }
}
