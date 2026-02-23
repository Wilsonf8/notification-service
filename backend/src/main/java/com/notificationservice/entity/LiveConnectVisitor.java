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

    // GeoIP fields
    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "region", length = 100)
    private String region;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "timezone", length = 64)
    private String timezone;

    // Device/browser fields
    @Column(name = "browser_name", length = 64)
    private String browserName;

    @Column(name = "browser_version", length = 32)
    private String browserVersion;

    @Column(name = "os_name", length = 64)
    private String osName;

    @Column(name = "os_version", length = 32)
    private String osVersion;

    @Column(name = "device_type", length = 16)
    private String deviceType;

    @Column(name = "screen_width")
    private Short screenWidth;

    @Column(name = "screen_height")
    private Short screenHeight;

    @Column(name = "language", length = 16)
    private String language;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    // CRM fields
    @Enumerated(EnumType.STRING)
    @Column(name = "pipeline_stage")
    @Builder.Default
    private PipelineStage pipelineStage = PipelineStage.NEW;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_rep_id")
    private LiveConnectRep assignedRep;

    @Column(name = "lead_score")
    @Builder.Default
    private Integer leadScore = 0;

    @Column(name = "first_seen_at")
    private OffsetDateTime firstSeenAt;

    @Column(name = "last_seen_at")
    private OffsetDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
