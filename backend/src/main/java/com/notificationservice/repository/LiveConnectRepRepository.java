package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.RepAvailability;
import com.notificationservice.entity.RepPresence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect reps.
 */
public interface LiveConnectRepRepository extends JpaRepository<LiveConnectRep, UUID> {

    @Query("SELECT r FROM LiveConnectRep r WHERE r.project.id = :projectId AND r.user.id = :userId")
    Optional<LiveConnectRep> findByProjectIdAndUserId(UUID projectId, UUID userId);

    @Query("SELECT r FROM LiveConnectRep r WHERE r.project.id = :projectId AND r.availability = :availability AND r.presence = :presence")
    List<LiveConnectRep> findByProjectIdAndAvailabilityAndPresence(UUID projectId, RepAvailability availability, RepPresence presence);

    @Query("SELECT r FROM LiveConnectRep r WHERE r.project.id = :projectId AND r.availability = 'AVAILABLE' AND r.presence = 'ONLINE'")
    List<LiveConnectRep> findAvailableByProjectId(UUID projectId);

    @Query("SELECT r FROM LiveConnectRep r WHERE r.project.id = :projectId")
    List<LiveConnectRep> findByProjectId(UUID projectId);

    @Query("SELECT r FROM LiveConnectRep r WHERE r.presence = 'ONLINE' AND r.lastHeartbeat < :threshold")
    List<LiveConnectRep> findStaleOnlineReps(OffsetDateTime threshold);

    @Query("SELECT r FROM LiveConnectRep r WHERE r.user.id = :userId")
    List<LiveConnectRep> findByUserId(UUID userId);
}
