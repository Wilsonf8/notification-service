package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectPageView;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository for LiveConnect page view records.
 */
@Repository
public interface LiveConnectPageViewRepository extends JpaRepository<LiveConnectPageView, Long> {

    /**
     * Finds page views for a visitor, ordered by most recent first.
     *
     * @param visitorId the visitor's internal ID
     * @param pageable pagination parameters
     * @return list of page views
     */
    List<LiveConnectPageView> findByVisitorIdOrderByVisitedAtDesc(UUID visitorId, Pageable pageable);

    /**
     * Deletes page views older than the given threshold.
     *
     * @param threshold the cutoff timestamp
     * @return number of deleted rows
     */
    @Modifying
    @Query("DELETE FROM LiveConnectPageView p WHERE p.visitedAt < :threshold")
    int deleteOlderThan(OffsetDateTime threshold);
}
