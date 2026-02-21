package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectVisitorVisit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Repository for LiveConnect visitor visits (browsing sessions).
 */
public interface LiveConnectVisitorVisitRepository extends JpaRepository<LiveConnectVisitorVisit, UUID> {

    /**
     * Finds the most recent visit for a visitor (regardless of whether it is open or closed).
     *
     * @param visitorId the visitor's internal ID
     * @return the latest visit, or empty if no visits exist
     */
    @Query("SELECT v FROM LiveConnectVisitorVisit v WHERE v.visitor.id = :visitorId ORDER BY v.startedAt DESC LIMIT 1")
    Optional<LiveConnectVisitorVisit> findLatestByVisitorId(UUID visitorId);

    /**
     * Finds the currently active (open) visit for a visitor, where endedAt is null.
     *
     * @param visitorId the visitor's internal ID
     * @return the active visit, or empty if no open visit exists
     */
    @Query("SELECT v FROM LiveConnectVisitorVisit v WHERE v.visitor.id = :visitorId AND v.endedAt IS NULL")
    Optional<LiveConnectVisitorVisit> findActiveByVisitorId(UUID visitorId);

    /**
     * Finds the most recent completed visit for a visitor (endedAt is not null).
     * Used for the "last seen" badge display.
     *
     * @param visitorId the visitor's internal ID
     * @return the latest completed visit, or empty if none exist
     */
    @Query("SELECT v FROM LiveConnectVisitorVisit v WHERE v.visitor.id = :visitorId AND v.endedAt IS NOT NULL ORDER BY v.endedAt DESC LIMIT 1")
    Optional<LiveConnectVisitorVisit> findLatestCompletedByVisitorId(UUID visitorId);

    /**
     * Counts visits for a visitor since a given timestamp.
     *
     * @param visitorId the visitor's internal ID
     * @param since     the start of the time window
     * @return number of visits since the given timestamp
     */
    @Query("SELECT COUNT(v) FROM LiveConnectVisitorVisit v WHERE v.visitor.id = :visitorId AND v.startedAt >= :since")
    long countByVisitorIdSince(UUID visitorId, OffsetDateTime since);

    /**
     * Counts total visits for a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @return total number of visits
     */
    @Query("SELECT COUNT(v) FROM LiveConnectVisitorVisit v WHERE v.visitor.id = :visitorId")
    long countByVisitorId(UUID visitorId);

    /**
     * Returns paginated visit history for a visitor, ordered by most recent first.
     *
     * @param visitorId the visitor's internal ID
     * @param pageable  pagination parameters
     * @return a page of visits
     */
    @Query("SELECT v FROM LiveConnectVisitorVisit v WHERE v.visitor.id = :visitorId ORDER BY v.startedAt DESC")
    Page<LiveConnectVisitorVisit> findByVisitorIdOrderByStartedAtDesc(UUID visitorId, Pageable pageable);

    /**
     * Counts total visits for each visitor in a batch. Returns a list of Object arrays
     * where each element is [visitorId (UUID), count (Long)].
     * Used to avoid N+1 queries when rendering the visitors list.
     *
     * @param visitorIds the set of visitor internal IDs
     * @return list of [visitorId, count] pairs
     */
    @Query("SELECT v.visitor.id, COUNT(v) FROM LiveConnectVisitorVisit v WHERE v.visitor.id IN :visitorIds GROUP BY v.visitor.id")
    List<Object[]> countByVisitorIds(Set<UUID> visitorIds);

    /**
     * Finds the latest completed visit endedAt for each visitor in a batch.
     * Returns a list of Object arrays where each element is [visitorId (UUID), endedAt (OffsetDateTime)].
     * Used to avoid N+1 queries when rendering the "last seen" badge on the visitors list.
     *
     * @param visitorIds the set of visitor internal IDs
     * @return list of [visitorId, endedAt] pairs
     */
    @Query("SELECT v.visitor.id, MAX(v.endedAt) FROM LiveConnectVisitorVisit v WHERE v.visitor.id IN :visitorIds AND v.endedAt IS NOT NULL GROUP BY v.visitor.id")
    List<Object[]> findLatestCompletedEndedAtByVisitorIds(Set<UUID> visitorIds);

    /**
     * Returns total visit count and latest completed endedAt in a single query.
     * Combines countByVisitorId + findLatestCompletedByVisitorId to avoid 2 DB round-trips.
     * Returns [totalCount (Long), latestEndedAt (OffsetDateTime or null)].
     *
     * @param visitorId the visitor's internal ID
     * @return Object array with [count, latestEndedAt]
     */
    @Query("SELECT COUNT(v), (SELECT MAX(v2.endedAt) FROM LiveConnectVisitorVisit v2 WHERE v2.visitor.id = :visitorId AND v2.endedAt IS NOT NULL) FROM LiveConnectVisitorVisit v WHERE v.visitor.id = :visitorId")
    Object[] countAndLatestEndedAtByVisitorId(UUID visitorId);
}
