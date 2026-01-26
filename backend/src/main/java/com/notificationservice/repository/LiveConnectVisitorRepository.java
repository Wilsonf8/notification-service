package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectVisitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
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

    @Query("SELECT v FROM LiveConnectVisitor v WHERE v.project.id = :projectId ORDER BY v.lastSeenAt DESC")
    List<LiveConnectVisitor> findByProjectIdOrderByLastSeenAtDesc(UUID projectId);

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
}
