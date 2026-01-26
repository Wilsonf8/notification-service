package com.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a message in a conversation.
 */
@Entity
@Table(name = "liveconnect_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveConnectMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private LiveConnectConversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private MessageSenderType senderType;

    @Column(name = "sender_id")
    private UUID senderId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
