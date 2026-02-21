package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectVisitor;
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
}
