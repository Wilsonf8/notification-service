package com.notificationservice.websocket.scheduler;

import com.notificationservice.repository.LiveConnectRepRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Batches rep heartbeat updates to reduce database writes.
 * Instead of writing lastHeartbeat on every heartbeat per rep,
 * collects rep IDs and flushes a single batch UPDATE every 10 seconds.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RepHeartbeatBatchProcessor {

    private final LiveConnectRepRepository repRepository;

    private final Set<UUID> pendingHeartbeats = ConcurrentHashMap.newKeySet();

    /**
     * Records a heartbeat for a rep. No database call is made here;
     * the rep ID is queued for the next batch flush.
     *
     * @param repId the rep's internal ID
     */
    public void recordHeartbeat(UUID repId) {
        pendingHeartbeats.add(repId);
    }

    /**
     * Flushes all pending rep heartbeats in a single batch UPDATE query.
     * Runs every 10 seconds.
     */
    @Scheduled(fixedRate = 10000)
    @Transactional
    public void flushHeartbeats() {
        if (pendingHeartbeats.isEmpty()) {
            return;
        }

        Set<UUID> batch = Set.copyOf(pendingHeartbeats);
        pendingHeartbeats.clear();

        repRepository.batchUpdateLastHeartbeat(batch, OffsetDateTime.now());
        log.debug("Flushed {} rep heartbeat updates", batch.size());
    }
}
