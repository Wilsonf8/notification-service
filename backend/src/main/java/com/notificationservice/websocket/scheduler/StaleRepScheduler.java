package com.notificationservice.websocket.scheduler;

import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.service.LiveConnectRepService;
import com.notificationservice.service.LiveConnectRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Scheduler that detects reps whose heartbeat has gone stale (e.g., iOS app force-quit,
 * network loss, crash). Marks them OFFLINE and withdraws their pending pings so visitors
 * don't see stale incoming call requests.
 * Runs every 30 seconds with a 90-second staleness threshold (3 missed heartbeats).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StaleRepScheduler {

    private final LiveConnectRepRepository repRepository;
    private final LiveConnectRepService repService;
    private final LiveConnectRequestService requestService;

    /**
     * Checks for stale online reps every 30 seconds.
     * A rep is stale if their last heartbeat is older than 90 seconds.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void checkStaleReps() {
        OffsetDateTime threshold = OffsetDateTime.now().minusSeconds(90);
        List<LiveConnectRep> staleReps = repRepository.findStaleOnlineReps(threshold);

        if (staleReps.isEmpty()) {
            return;
        }

        for (LiveConnectRep rep : staleReps) {
            rep.setPresence(RepPresence.OFFLINE);
            rep.setActiveConnections(0);
            repRepository.save(rep);
            repService.broadcastRepStatusChanged(rep.getId());

            requestService.withdrawPendingPingsOnDisconnect(
                    rep.getId(), rep.getProject().getId()
            );

            log.info("Stale rep detected and marked OFFLINE: repId={}, projectId={}, lastHeartbeat={}",
                    rep.getId(), rep.getProject().getId(), rep.getLastHeartbeat());
        }

        log.debug("Processed {} stale reps", staleReps.size());
    }
}
