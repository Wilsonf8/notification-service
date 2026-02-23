package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectVisitorNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

/**
 * Repository for visitor CRM notes.
 */
public interface LiveConnectVisitorNoteRepository extends JpaRepository<LiveConnectVisitorNote, UUID> {

    /**
     * Finds notes for a visitor, newest first, paginated.
     */
    @Query("SELECT n FROM LiveConnectVisitorNote n WHERE n.visitor.id = :visitorId ORDER BY n.createdAt DESC")
    Page<LiveConnectVisitorNote> findByVisitorIdOrderByCreatedAtDesc(UUID visitorId, Pageable pageable);
}
