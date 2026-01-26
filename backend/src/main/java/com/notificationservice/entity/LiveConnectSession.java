package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents an authenticated session for a visitor using the widget.
 */
@Entity
@Table(name = "liveconnect_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_token", nullable = false, unique = true)
    private String sessionToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visitor_id")
    private LiveConnectVisitor visitor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "embed_key_id")
    private LiveConnectEmbedKey embedKey;

    @Column(name = "last_activity_at")
    private OffsetDateTime lastActivityAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
