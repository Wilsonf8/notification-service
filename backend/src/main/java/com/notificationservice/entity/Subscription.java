package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents an organization's Stripe subscription.
 * Each organization can have at most one subscription.
 */
@Entity
@Table(name = "subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false, unique = true)
    private Organization organization;

    @Column(name = "stripe_subscription_id", nullable = false, unique = true)
    private String stripeSubscriptionId;

    @Column(name = "stripe_price_id")
    private String stripePriceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.INACTIVE;

    @Column(name = "current_period_start")
    private OffsetDateTime currentPeriodStart;

    @Column(name = "current_period_end")
    private OffsetDateTime currentPeriodEnd;

    @Column(name = "cancel_at_period_end")
    @Builder.Default
    private Boolean cancelAtPeriodEnd = false;

    @Column(name = "canceled_at")
    private OffsetDateTime canceledAt;

    @Column(name = "last_event_timestamp")
    private Long lastEventTimestamp;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    /**
     * Checks if the subscription is in an active state (ACTIVE or PAST_DUE grace period).
     * @return true if the widget should be allowed to function
     */
    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PAST_DUE;
    }
}
