package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/**
 * Repository for LiveConnect messages.
 */
public interface LiveConnectMessageRepository extends JpaRepository<LiveConnectMessage, UUID> {

    @Query("SELECT m FROM LiveConnectMessage m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt DESC")
    Page<LiveConnectMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    @Query("SELECT m FROM LiveConnectMessage m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt ASC")
    List<LiveConnectMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    @Query("SELECT COUNT(m) FROM LiveConnectMessage m WHERE m.conversation.id = :conversationId")
    long countByConversationId(UUID conversationId);
}
