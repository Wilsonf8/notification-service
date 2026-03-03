package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.ConversationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.project.id = :projectId AND c.status = :status ORDER BY c.startedAt DESC")
    Page<LiveConnectConversation> findByProjectIdAndStatusPaged(UUID projectId, ConversationStatus status, Pageable pageable);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.project.id = :projectId AND c.type = :type ORDER BY c.startedAt DESC")
    Page<LiveConnectConversation> findByProjectIdAndType(UUID projectId, ConversationType type, Pageable pageable);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.project.id = :projectId AND c.status = :status AND c.type = :type ORDER BY c.startedAt DESC")
    Page<LiveConnectConversation> findByProjectIdAndStatusAndType(UUID projectId, ConversationStatus status, ConversationType type, Pageable pageable);

    @Query("SELECT c FROM LiveConnectConversation c WHERE c.visitor.id = :visitorId ORDER BY c.startedAt DESC")
    List<LiveConnectConversation> findByVisitorId(UUID visitorId);

    /**
     * Finds a conversation by its LiveKit room name.
     *
     * @param liveKitRoomName the LiveKit room name
     * @return the conversation if found
     */
    Optional<LiveConnectConversation> findByLiveKitRoomName(String liveKitRoomName);

    /**
     * Finds all active conversations for a project, ordered by start time.
     *
     * @param projectId the project ID
     * @return list of active conversations
     */
    @Query("SELECT c FROM LiveConnectConversation c WHERE c.project.id = :projectId AND c.status = 'ACTIVE' ORDER BY c.startedAt ASC")
    List<LiveConnectConversation> findActiveByProjectId(UUID projectId);

    /**
     * Finds all active conversations across all projects.
     *
     * @return list of all active conversations
     */
    @Query("SELECT c FROM LiveConnectConversation c WHERE c.status = 'ACTIVE'")
    List<LiveConnectConversation> findAllActive();

    /**
     * Counts VIDEO_CALL conversations for a visitor since a given time.
     *
     * @param visitorId the visitor's internal ID
     * @param since     the start of the time window
     * @return count of video calls
     */
    @Query("SELECT COUNT(c) FROM LiveConnectConversation c WHERE c.visitor.id = :visitorId AND c.type = 'VIDEO_CALL' AND c.startedAt >= :since")
    long countCallsByVisitorSince(UUID visitorId, OffsetDateTime since);

    /**
     * Checks if any conversations exist for a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @return true if any conversations exist
     */
    @Query("SELECT COUNT(c) > 0 FROM LiveConnectConversation c WHERE c.visitor.id = :visitorId")
    boolean existsAnyByVisitorId(UUID visitorId);

    /**
     * Returns combined conversation stats for a returning visitor in a single query.
     * Combines countCallsByVisitorSince + existsAnyByVisitorId to reduce 2 DB round-trips to 1.
     * Returns [callsSince (Long), hasAnyConversations (Boolean)].
     *
     * @param visitorId the visitor's internal ID
     * @param since the start of the time window
     * @return Object array with [callsSince, hasAny]
     */
    @Query("SELECT " +
           "SUM(CASE WHEN c.type = 'VIDEO_CALL' AND c.startedAt >= :since THEN 1 ELSE 0 END), " +
           "COUNT(c) > 0 " +
           "FROM LiveConnectConversation c WHERE c.visitor.id = :visitorId")
    Object[] getVisitorConversationStats(UUID visitorId, OffsetDateTime since);

    /**
     * Finds visitor IDs that have had any conversation (batch check for isFirstVisit).
     *
     * @param visitorIds the set of visitor IDs to check
     * @return set of visitor IDs that have at least one conversation
     */
    @Query("SELECT DISTINCT c.visitor.id FROM LiveConnectConversation c WHERE c.visitor.id IN :visitorIds")
    Set<UUID> findVisitorIdsWithAnyConversation(Set<UUID> visitorIds);

    /**
     * Finds conversations for a specific visitor, paginated and ordered by most recent first.
     *
     * @param visitorId the visitor's internal ID
     * @param pageable  pagination parameters
     * @return paginated list of conversations
     */
    @Query("SELECT c FROM LiveConnectConversation c WHERE c.visitor.id = :visitorId ORDER BY c.startedAt DESC")
    Page<LiveConnectConversation> findByVisitorIdPaged(UUID visitorId, Pageable pageable);
}
