package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Represents a visitor on a customer's website using the LiveConnect widget.
 */
@Entity
@Table(name = "liveconnect_visitors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectVisitor {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "visitor_id", nullable = false)
    private String visitorId;

    @Column(name = "identified_user_id")
    private String identifiedUserId;

    private String name;

    private String email;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "active_connections")
    @Builder.Default
    private Integer activeConnections = 0;

    @Column(name = "disconnected_at")
    private OffsetDateTime disconnectedAt;

    @Column(name = "ping_cooldown_until")
    private OffsetDateTime pingCooldownUntil;

    @Column(name = "first_seen_at")
    private OffsetDateTime firstSeenAt;

    @Column(name = "last_seen_at")
    private OffsetDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
