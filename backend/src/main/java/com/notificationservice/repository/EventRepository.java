package com.notificationservice.repository;

import com.notificationservice.entity.Event;
import com.notificationservice.entity.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {

    @Query("SELECT e FROM Event e WHERE e.project.id = :projectId AND e.createdAt >= :since ORDER BY e.createdAt DESC")
    Page<Event> findByProjectIdAndCreatedAtAfter(UUID projectId, OffsetDateTime since, Pageable pageable);

    @Query("SELECT e FROM Event e WHERE e.status = :status AND e.expiresAt > :now ORDER BY e.createdAt ASC")
    List<Event> findByStatusAndNotExpired(EventStatus status, OffsetDateTime now, Pageable pageable);

    @Query("SELECT e FROM Event e WHERE e.project.id = :projectId AND e.idempotencyKey = :idempotencyKey")
    Optional<Event> findByProjectIdAndIdempotencyKey(UUID projectId, String idempotencyKey);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.project.id = :projectId AND e.status = 'QUEUED'")
    long countQueuedByProjectId(UUID projectId);

    @Modifying
    @Query("UPDATE Event e SET e.status = 'EXPIRED' WHERE e.status = 'QUEUED' AND e.expiresAt < :now")
    int expireOldEvents(OffsetDateTime now);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.project.id = :projectId AND e.createdAt >= :since")
    long countByProjectIdSince(UUID projectId, OffsetDateTime since);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.project.id = :projectId AND e.status = :status AND e.createdAt >= :since")
    long countByProjectIdAndStatusSince(UUID projectId, EventStatus status, OffsetDateTime since);
}
