package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Records a block placed on a visitor by a rep.
 * Blocked visitors can be prevented from initiating new conversations.
 */
@Entity
@Table(name = "visitor_blocks", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"project_id", "visitor_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitorBlock {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visitor_id", nullable = false)
    private LiveConnectVisitor visitor;

    @Column(name = "blocked_by_user_id", nullable = false)
    private UUID blockedByUserId;

    @Column(name = "reason", length = 500)
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
