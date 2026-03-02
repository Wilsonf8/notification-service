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

    /**
     * Finds messages for a conversation with pagination, ordered oldest first.
     *
     * @param conversationId the conversation ID
     * @param pageable       pagination parameters
     * @return paginated list of messages
     */
    @Query("SELECT m FROM LiveConnectMessage m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt ASC")
    Page<LiveConnectMessage> findByConversationIdOrderByCreatedAtAscPaged(UUID conversationId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM LiveConnectMessage m WHERE m.conversation.id = :conversationId")
    long countByConversationId(UUID conversationId);

    /**
     * Counts messages for multiple conversations in a single query.
     * Avoids N+1 when rendering conversation lists.
     *
     * @param conversationIds the conversation IDs
     * @return list of [conversationId, count] pairs
     */
    @Query("SELECT m.conversation.id, COUNT(m) FROM LiveConnectMessage m WHERE m.conversation.id IN :conversationIds GROUP BY m.conversation.id")
    List<Object[]> countByConversationIds(java.util.Collection<UUID> conversationIds);
}
