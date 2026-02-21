package com.notificationservice.websocket.scheduler;

import com.notificationservice.repository.LiveConnectVisitorRepository;
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
 * Batches visitor heartbeat updates to reduce database writes.
 * Instead of writing lastSeenAt on every heartbeat (every 15s per visitor),
 * collects visitor IDs and flushes a single batch UPDATE every 10 seconds.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HeartbeatBatchProcessor {

    private final LiveConnectVisitorRepository visitorRepository;

    private final Set<UUID> pendingHeartbeats = ConcurrentHashMap.newKeySet();

    /**
     * Records a heartbeat for a visitor. No database call is made here;
     * the visitor ID is queued for the next batch flush.
     *
     * @param visitorId the visitor's internal ID
     */
    public void recordHeartbeat(UUID visitorId) {
        pendingHeartbeats.add(visitorId);
    }

    /**
     * Flushes all pending heartbeats in a single batch UPDATE query.
     * Runs every 10 seconds. At 200 concurrent visitors, this replaces
     * ~14 individual writes/sec with 1 batch write every 10 seconds.
     */
    @Scheduled(fixedRate = 10000)
    @Transactional
    public void flushHeartbeats() {
        if (pendingHeartbeats.isEmpty()) {
            return;
        }

        // Drain the set atomically by copying and clearing
        Set<UUID> batch = Set.copyOf(pendingHeartbeats);
        pendingHeartbeats.clear();

        visitorRepository.batchUpdateLastSeenAt(batch, OffsetDateTime.now());
        log.debug("Flushed {} heartbeat updates", batch.size());
    }
}
