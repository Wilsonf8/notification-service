package com.notificationservice.websocket.scheduler;

import com.notificationservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Scheduled cleanup tasks to prevent unbounded table growth.
 * Runs daily at 3:00 AM to purge stale data from high-growth tables.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataCleanupScheduler {

    private static final int SESSION_RETENTION_DAYS = 7;
    private static final int PAGE_VIEW_RETENTION_DAYS = 90;
    private static final int WEBHOOK_RETENTION_DAYS = 30;
    private static final int STRIPE_EVENT_RETENTION_DAYS = 30;
    private static final int VISIT_RETENTION_DAYS = 180;

    private final LiveConnectSessionRepository sessionRepository;
    private final LiveConnectPageViewRepository pageViewRepository;
    private final LiveConnectProcessedWebhookRepository webhookRepository;
    private final StripeProcessedEventRepository stripeEventRepository;
    private final LiveConnectVisitorVisitRepository visitRepository;

    /**
     * Purges expired sessions. Sessions have an explicit expiresAt field.
     * Runs daily at 3:00 AM.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredSessions() {
        int deleted = sessionRepository.deleteExpired(OffsetDateTime.now());
        if (deleted > 0) {
            log.info("Cleaned up {} expired sessions", deleted);
        }
    }

    /**
     * Purges page views older than 90 days.
     * Runs daily at 3:10 AM.
     */
    @Scheduled(cron = "0 10 3 * * *")
    @Transactional
    public void cleanupOldPageViews() {
        OffsetDateTime threshold = OffsetDateTime.now().minusDays(PAGE_VIEW_RETENTION_DAYS);
        int deleted = pageViewRepository.deleteOlderThan(threshold);
        if (deleted > 0) {
            log.info("Cleaned up {} page views older than {} days", deleted, PAGE_VIEW_RETENTION_DAYS);
        }
    }

    /**
     * Purges processed webhook records older than 30 days.
     * These are only needed for idempotency within a short window.
     * Runs daily at 3:20 AM.
     */
    @Scheduled(cron = "0 20 3 * * *")
    @Transactional
    public void cleanupOldWebhooks() {
        OffsetDateTime threshold = OffsetDateTime.now().minusDays(WEBHOOK_RETENTION_DAYS);
        int deleted = webhookRepository.deleteOlderThan(threshold);
        if (deleted > 0) {
            log.info("Cleaned up {} processed webhooks older than {} days", deleted, WEBHOOK_RETENTION_DAYS);
        }
    }

    /**
     * Purges processed Stripe events older than 30 days.
     * These are only needed for idempotency within a short window.
     * Runs daily at 3:30 AM.
     */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void cleanupOldStripeEvents() {
        OffsetDateTime threshold = OffsetDateTime.now().minusDays(STRIPE_EVENT_RETENTION_DAYS);
        int deleted = stripeEventRepository.deleteOlderThan(threshold);
        if (deleted > 0) {
            log.info("Cleaned up {} Stripe events older than {} days", deleted, STRIPE_EVENT_RETENTION_DAYS);
        }
    }

    /**
     * Purges completed visitor visits older than 180 days.
     * Only removes visits that have ended (active visits are preserved).
     * Runs daily at 3:40 AM.
     */
    @Scheduled(cron = "0 40 3 * * *")
    @Transactional
    public void cleanupOldVisits() {
        OffsetDateTime threshold = OffsetDateTime.now().minusDays(VISIT_RETENTION_DAYS);
        int deleted = visitRepository.deleteCompletedOlderThan(threshold);
        if (deleted > 0) {
            log.info("Cleaned up {} completed visits older than {} days", deleted, VISIT_RETENTION_DAYS);
        }
    }
}
