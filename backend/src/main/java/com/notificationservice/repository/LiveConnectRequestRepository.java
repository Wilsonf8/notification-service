package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect requests.
 */
public interface LiveConnectRequestRepository extends JpaRepository<LiveConnectRequest, UUID> {

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.project.id = :projectId AND r.status = 'PENDING' ORDER BY r.createdAt ASC")
    List<LiveConnectRequest> findPendingByProjectId(UUID projectId);

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.visitor.id = :visitorId AND r.status = 'PENDING'")
    Optional<LiveConnectRequest> findPendingByVisitorId(UUID visitorId);

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.project.id = :projectId AND r.visitor.id = :visitorId AND r.status = 'PENDING'")
    Optional<LiveConnectRequest> findPendingByProjectIdAndVisitorId(UUID projectId, UUID visitorId);

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.project.id = :projectId AND r.status = :status ORDER BY r.createdAt DESC")
    List<LiveConnectRequest> findByProjectIdAndStatus(UUID projectId, RequestStatus status);

    @Modifying
    @Query("UPDATE LiveConnectRequest r SET r.status = 'EXPIRED' WHERE r.status = 'PENDING' AND r.expiresAt < :now")
    int expirePendingRequests(OffsetDateTime now);
}
