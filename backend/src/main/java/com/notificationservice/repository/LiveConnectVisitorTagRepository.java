package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectVisitorTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Repository for visitor-tag assignments.
 */
public interface LiveConnectVisitorTagRepository extends JpaRepository<LiveConnectVisitorTag, UUID> {

    /**
     * Finds all tag assignments for a visitor.
     */
    @Query("SELECT vt FROM LiveConnectVisitorTag vt JOIN FETCH vt.tag WHERE vt.visitor.id = :visitorId")
    List<LiveConnectVisitorTag> findByVisitorId(UUID visitorId);

    /**
     * Finds all tag assignments for a batch of visitors (for list view).
     */
    @Query("SELECT vt FROM LiveConnectVisitorTag vt JOIN FETCH vt.tag WHERE vt.visitor.id IN :visitorIds")
    List<LiveConnectVisitorTag> findByVisitorIds(Collection<UUID> visitorIds);

    /**
     * Deletes a tag assignment for a visitor.
     */
    @Modifying
    @Query("DELETE FROM LiveConnectVisitorTag vt WHERE vt.visitor.id = :visitorId AND vt.tag.id = :tagId")
    void deleteByVisitorIdAndTagId(UUID visitorId, UUID tagId);

    /**
     * Checks if a visitor already has a specific tag.
     */
    @Query("SELECT COUNT(vt) > 0 FROM LiveConnectVisitorTag vt WHERE vt.visitor.id = :visitorId AND vt.tag.id = :tagId")
    boolean existsByVisitorIdAndTagId(UUID visitorId, UUID tagId);
}
