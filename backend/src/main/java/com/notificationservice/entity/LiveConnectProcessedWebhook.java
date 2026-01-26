package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Tracks processed webhooks to ensure idempotency.
 */
@Entity
@Table(name = "liveconnect_processed_webhooks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectProcessedWebhook {
    @Id
    @Column(name = "event_id")
    private String eventId;

    @Column(name = "event_type")
    private String eventType;

    @CreationTimestamp
    @Column(name = "processed_at")
    private OffsetDateTime processedAt;
}
