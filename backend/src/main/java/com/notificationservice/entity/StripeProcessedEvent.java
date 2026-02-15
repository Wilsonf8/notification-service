package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Tracks processed Stripe webhook events for deduplication.
 */
@Entity
@Table(name = "stripe_processed_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StripeProcessedEvent {
    @Id
    @Column(name = "event_id")
    private String eventId;

    @Column(name = "event_type")
    private String eventType;

    @CreationTimestamp
    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;
}
