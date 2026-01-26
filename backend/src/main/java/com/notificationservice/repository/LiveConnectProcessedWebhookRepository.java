package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectProcessedWebhook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;

/**
 * Repository for tracking processed webhooks (idempotency).
 */
public interface LiveConnectProcessedWebhookRepository extends JpaRepository<LiveConnectProcessedWebhook, String> {

    boolean existsByEventId(String eventId);

    @Modifying
    @Query("DELETE FROM LiveConnectProcessedWebhook w WHERE w.processedAt < :threshold")
    int deleteOlderThan(OffsetDateTime threshold);
}
