package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Embed keys used to authenticate widget installations on customer websites.
 */
@Entity
@Table(name = "liveconnect_embed_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectEmbedKey {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "key_prefix", nullable = false)
    @Builder.Default
    private String keyPrefix = "lck_";

    @Column(name = "key_hash", nullable = false)
    private String keyHash;

    private String name;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "allowed_domains", columnDefinition = "TEXT[]")
    private List<String> allowedDomains;

    @Column(name = "is_revoked")
    @Builder.Default
    private Boolean isRevoked = false;

    @Column(name = "last_used_at")
    private OffsetDateTime lastUsedAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
