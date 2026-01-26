package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a request to connect (visitor wanting to talk, or rep initiating).
 */
@Entity
@Table(name = "liveconnect_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visitor_id")
    private LiveConnectVisitor visitor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initiated_by_rep_id")
    private LiveConnectRep initiatedByRep;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestDirection direction;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by_rep_id")
    private LiveConnectRep acceptedByRep;

    @Column(name = "accepted_at")
    private OffsetDateTime acceptedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private LiveConnectConversation conversation;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
