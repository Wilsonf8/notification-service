package com.notificationservice.repository;

import com.notificationservice.entity.StripeProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for Stripe webhook event deduplication.
 * Uses saveAndFlush with unique constraint to atomically detect duplicates.
 */
public interface StripeProcessedEventRepository extends JpaRepository<StripeProcessedEvent, String> {
}
