package com.notificationservice.service;

import com.notificationservice.dto.VisitorVisitDto;
import com.notificationservice.dto.VisitorVisitStatsDto;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.LiveConnectVisitorVisit;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.LiveConnectVisitorVisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Service for tracking visitor visits (browsing sessions).
 * A visit represents a continuous browsing session. If a visitor disconnects
 * and reconnects within 10 minutes, the existing visit is reopened rather
 * than creating a new one.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveConnectVisitService {

    private static final Duration VISIT_GAP_THRESHOLD = Duration.ofMinutes(10);

    private final LiveConnectVisitorVisitRepository visitRepository;
    private final LiveConnectVisitorRepository visitorRepository;

    /**
     * Records a visitor connection event. Called from the WebSocket handler when
     * {@code isFirstConnection == true} (i.e. the visitor had zero active connections
     * and now has one).
     * <p>
     * Logic:
     * <ol>
     *   <li>No prior visit: create a new visit and set {@code visitor.firstSeenAt} if null.</li>
     *   <li>Latest visit still open (endedAt == null): no-op (multi-tab scenario).</li>
     *   <li>Gap &lt; 10 minutes since last visit ended: reopen the visit (set endedAt = null).</li>
     *   <li>Gap &ge; 10 minutes: create a new visit.</li>
     * </ol>
     *
     * @param visitor the visitor who connected
     * @return the active visit (newly created or reopened), or null if no-op
     */
    @Transactional
    public LiveConnectVisitorVisit recordConnection(LiveConnectVisitor visitor) {
        OffsetDateTime now = OffsetDateTime.now();

        var latestVisit = visitRepository.findLatestByVisitorId(visitor.getId());

        if (latestVisit.isEmpty()) {
            // No prior visit — create new visit and set firstSeenAt if needed
            if (visitor.getFirstSeenAt() == null) {
                visitor.setFirstSeenAt(now);
                visitorRepository.save(visitor);
            }
            return createNewVisit(visitor, now);
        }

        LiveConnectVisitorVisit latest = latestVisit.get();

        if (latest.getEndedAt() == null) {
            // Visit still open (multi-tab) — no-op
            log.debug("Visit {} still open for visitor {}, skipping (multi-tab)",
                    latest.getId(), visitor.getId());
            return null;
        }

        Duration gap = Duration.between(latest.getEndedAt(), now);

        if (gap.compareTo(VISIT_GAP_THRESHOLD) < 0) {
            // Gap < 10 min — reopen the existing visit
            latest.setEndedAt(null);
            log.debug("Reopening visit {} for visitor {} (gap: {}s)",
                    latest.getId(), visitor.getId(), gap.toSeconds());
            return visitRepository.save(latest);
        }

        // Gap >= 10 min — create a new visit
        return createNewVisit(visitor, now);
    }

    /**
     * Records a visitor disconnection event. Called from the WebSocket handler when
     * {@code isLastConnection == true} (i.e. the visitor's active connections dropped to zero).
     * Finds the currently active visit and sets its {@code endedAt} to now.
     *
     * @param visitorId the internal ID of the visitor who disconnected
     */
    @Transactional
    public void recordDisconnection(UUID visitorId) {
        var activeVisit = visitRepository.findActiveByVisitorId(visitorId);

        if (activeVisit.isEmpty()) {
            log.warn("No active visit found for visitor {} on disconnection", visitorId);
            return;
        }

        LiveConnectVisitorVisit visit = activeVisit.get();
        visit.setEndedAt(OffsetDateTime.now());
        visitRepository.save(visit);
        log.debug("Ended visit {} for visitor {}", visit.getId(), visitorId);
    }

    /**
     * Returns visit count statistics for a visitor across multiple time windows
     * (24 hours, 3 days, 7 days) and a total count.
     *
     * @param visitorId the internal ID of the visitor
     * @return visit stats with counts for 24h, 3d, 7d, and total
     */
    @Transactional(readOnly = true)
    public VisitorVisitStatsDto getVisitStats(UUID visitorId) {
        OffsetDateTime now = OffsetDateTime.now();

        long visits24h = visitRepository.countByVisitorIdSince(visitorId, now.minusHours(24));
        long visits3d = visitRepository.countByVisitorIdSince(visitorId, now.minusDays(3));
        long visits7d = visitRepository.countByVisitorIdSince(visitorId, now.minusDays(7));
        long total = visitRepository.countByVisitorId(visitorId);

        return new VisitorVisitStatsDto(visits24h, visits3d, visits7d, total);
    }

    /**
     * Returns paginated visit history for a visitor, ordered by most recent first.
     * Each visit is mapped to a {@link VisitorVisitDto}.
     *
     * @param visitorId the internal ID of the visitor
     * @param page      the zero-based page number
     * @param size      the page size
     * @return a page of visit DTOs
     */
    @Transactional(readOnly = true)
    public Page<VisitorVisitDto> getVisitHistory(UUID visitorId, int page, int size) {
        Page<LiveConnectVisitorVisit> visits = visitRepository.findByVisitorIdOrderByStartedAtDesc(
                visitorId, PageRequest.of(page, size));

        return visits.map(v -> {
            Long durationSeconds = null;
            if (v.getEndedAt() != null) {
                durationSeconds = Duration.between(v.getStartedAt(), v.getEndedAt()).toSeconds();
            }
            return new VisitorVisitDto(
                    v.getId(),
                    v.getStartedAt(),
                    v.getEndedAt(),
                    durationSeconds
            );
        });
    }

    /**
     * Creates a new visit for a visitor starting at the given time.
     *
     * @param visitor the visitor entity
     * @param now     the start time of the visit
     * @return the persisted visit entity
     */
    private LiveConnectVisitorVisit createNewVisit(LiveConnectVisitor visitor, OffsetDateTime now) {
        LiveConnectVisitorVisit visit = LiveConnectVisitorVisit.builder()
                .visitor(visitor)
                .project(visitor.getProject())
                .startedAt(now)
                .build();

        visit = visitRepository.save(visit);
        log.debug("Created new visit {} for visitor {}", visit.getId(), visitor.getId());
        return visit;
    }
}
