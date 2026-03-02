package com.notificationservice.repository;

import com.notificationservice.entity.StripeProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;

/**
 * Repository for Stripe webhook event deduplication.
 * Uses saveAndFlush with unique constraint to atomically detect duplicates.
 */
public interface StripeProcessedEventRepository extends JpaRepository<StripeProcessedEvent, String> {

    /**
     * Deletes processed events older than the given threshold.
     *
     * @param threshold the cutoff timestamp
     * @return number of deleted rows
     */
    @Modifying
    @Query("DELETE FROM StripeProcessedEvent e WHERE e.processedAt < :threshold")
    int deleteOlderThan(OffsetDateTime threshold);
}
