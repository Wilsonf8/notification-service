package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.ConversationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect conversations.
 */
public interface LiveConnectConversationRepository extends JpaRepository<LiveConnectConversation, UUID> {

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.visitor.id = :visitorId AND c.status = 'ACTIVE'")
    Optional<LiveConnectConversation> findActiveByVisitorId(UUID visitorId);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.rep.id = :repId AND c.status = 'ACTIVE'")
    Optional<LiveConnectConversation> findActiveByRepId(UUID repId);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.project.id = :projectId ORDER BY c.startedAt DESC")
    Page<LiveConnectConversation> findByProjectId(UUID projectId, Pageable pageable);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.project.id = :projectId AND c.status = :status ORDER BY c.startedAt DESC")
    List<LiveConnectConversation> findByProjectIdAndStatus(UUID projectId, ConversationStatus status);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.project.id = :projectId AND c.type = :type ORDER BY c.startedAt DESC")
    Page<LiveConnectConversation> findByProjectIdAndType(UUID projectId, ConversationType type, Pageable pageable);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.visitor.id = :visitorId ORDER BY c.startedAt DESC")
    List<LiveConnectConversation> findByVisitorId(UUID visitorId);
}
