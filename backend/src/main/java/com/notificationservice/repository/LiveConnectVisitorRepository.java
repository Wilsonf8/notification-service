package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.PipelineStage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect visitors.
 */
public interface LiveConnectVisitorRepository extends JpaRepository<LiveConnectVisitor, UUID> {

    @Query("SELECT v FROM LiveConnectVisitor v WHERE v.project.id = :projectId AND v.visitorId = :visitorId")
    Optional<LiveConnectVisitor> findByProjectIdAndVisitorId(UUID projectId, String visitorId);

    @Query("SELECT v FROM LiveConnectVisitor v WHERE v.project.id = :projectId AND v.identifiedUserId = :identifiedUserId")
    Optional<LiveConnectVisitor> findByProjectIdAndIdentifiedUserId(UUID projectId, String identifiedUserId);

    /**
     * Finds visitors for a project, paginated and ordered by most recently seen.
     *
     * @param projectId the project ID
     * @param pageable pagination parameters
     * @return paginated list of visitors
     */
    @Query("SELECT v FROM LiveConnectVisitor v WHERE v.project.id = :projectId ORDER BY v.lastSeenAt DESC")
    Page<LiveConnectVisitor> findByProjectIdOrderByLastSeenAtDesc(UUID projectId, Pageable pageable);

    @Query("SELECT v FROM LiveConnectVisitor v WHERE v.project.id = :projectId AND v.lastSeenAt > :threshold ORDER BY v.lastSeenAt DESC")
    List<LiveConnectVisitor> findOnlineByProjectId(UUID projectId, OffsetDateTime threshold);

    /**
     * Finds visitors who have disconnected and exceeded the grace period.
     *
     * @param connections the number of active connections (0 for disconnected)
     * @param threshold the disconnection time threshold
     * @return list of visitors past the grace period
     */
    @Query("SELECT v FROM LiveConnectVisitor v WHERE v.activeConnections = :connections AND v.disconnectedAt < :threshold")
    List<LiveConnectVisitor> findByActiveConnectionsAndDisconnectedAtBefore(int connections, OffsetDateTime threshold);

    /**
     * Batch update lastSeenAt for multiple visitors in a single query.
     *
     * @param visitorIds the visitor IDs to update
     * @param now the timestamp to set
     */
    @Modifying
    @Query("UPDATE LiveConnectVisitor v SET v.lastSeenAt = :now WHERE v.id IN :visitorIds")
    void batchUpdateLastSeenAt(Collection<UUID> visitorIds, OffsetDateTime now);

    /**
     * Finds visitors for CRM list view with time-range filter, optional search,
     * stage filter, tag filter (AND logic), and boolean filters.
     *
     * @param projectId      the project ID
     * @param since          the earliest lastSeenAt threshold
     * @param search         optional search term (null or empty to skip)
     * @param stages         optional pipeline stages to filter by (null to skip)
     * @param tagIds         optional tag IDs for AND-logic filtering (null to skip)
     * @param tagCount       number of tags required (used with tagIds for AND logic)
     * @param hasBeenInCall  if true, only visitors with at least one VIDEO_CALL conversation
     * @param hasContactForm if true, only visitors with at least one CONTACT_FORM conversation
     * @param hasContactInfo if true, only visitors with name, email, or phone set
     * @param repUpdatedInfo if true, only visitors whose contact was updated by a rep
     * @param onlineThreshold if non-null, only visitors with lastSeenAt >= this threshold
     * @param pageable       pagination and sorting parameters
     * @return paginated list of visitors matching the criteria
     */
    @Query("SELECT v FROM LiveConnectVisitor v WHERE v.project.id = :projectId " +
           "AND v.lastSeenAt >= :since " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(v.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.city) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.country) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:stages IS NULL OR v.pipelineStage IN :stages) " +
           "AND (:tagIds IS NULL OR v.id IN (" +
           "  SELECT vt.visitor.id FROM LiveConnectVisitorTag vt " +
           "  WHERE vt.tag.id IN :tagIds " +
           "  GROUP BY vt.visitor.id " +
           "  HAVING COUNT(DISTINCT vt.tag.id) = :tagCount" +
           ")) " +
           "AND (:hasBeenInCall = false OR v.id IN (" +
           "  SELECT c.visitor.id FROM LiveConnectConversation c " +
           "  WHERE c.type = com.notificationservice.entity.ConversationType.VIDEO_CALL" +
           ")) " +
           "AND (:hasContactForm = false OR v.id IN (" +
           "  SELECT c.visitor.id FROM LiveConnectConversation c " +
           "  WHERE c.type = com.notificationservice.entity.ConversationType.CONTACT_FORM" +
           ")) " +
           "AND (:hasContactInfo = false OR v.name IS NOT NULL OR v.email IS NOT NULL OR v.phone IS NOT NULL) " +
           "AND (:repUpdatedInfo = false OR v.contactUpdatedAt IS NOT NULL) " +
           "AND (:onlineThreshold IS NULL OR v.lastSeenAt >= :onlineThreshold)")
    Page<LiveConnectVisitor> findForCrm(UUID projectId, OffsetDateTime since, String search,
                                        Collection<PipelineStage> stages, Collection<UUID> tagIds, long tagCount,
                                        boolean hasBeenInCall, boolean hasContactForm, boolean hasContactInfo,
                                        boolean repUpdatedInfo, OffsetDateTime onlineThreshold,
                                        Pageable pageable);
}
