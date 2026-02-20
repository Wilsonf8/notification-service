package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Notification preferences for a LiveConnect rep.
 * Controls which push notifications the rep receives.
 */
@Entity
@Table(name = "rep_notification_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepNotificationPreference {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rep_id", nullable = false, unique = true)
    private LiveConnectRep rep;

    @Column(name = "notify_visitor_presence")
    @Builder.Default
    private Boolean notifyVisitorPresence = true;

    @Column(name = "notify_visitor_request")
    @Builder.Default
    private Boolean notifyVisitorRequest = true;

    @Column(name = "notify_contact_form")
    @Builder.Default
    private Boolean notifyContactForm = true;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
