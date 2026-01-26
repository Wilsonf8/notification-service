package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a support representative who can handle LiveConnect calls.
 */
@Entity
@Table(name = "liveconnect_reps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectRep {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RepAvailability availability = RepAvailability.UNAVAILABLE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RepPresence presence = RepPresence.OFFLINE;

    @Column(name = "active_connections")
    @Builder.Default
    private Integer activeConnections = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_conversation_id")
    private LiveConnectConversation currentConversation;

    @Column(name = "call_started_at")
    private OffsetDateTime callStartedAt;

    @Column(name = "last_heartbeat")
    private OffsetDateTime lastHeartbeat;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
