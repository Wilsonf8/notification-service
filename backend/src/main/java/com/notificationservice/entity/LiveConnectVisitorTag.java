package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents the assignment of a tag to a visitor (join table).
 */
@Entity
@Table(name = "liveconnect_visitor_tags", uniqueConstraints = @UniqueConstraint(columnNames = {"visitor_id", "tag_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectVisitorTag {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visitor_id", nullable = false)
    private LiveConnectVisitor visitor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private LiveConnectTag tag;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tagged_by_rep_id")
    private LiveConnectRep taggedByRep;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
