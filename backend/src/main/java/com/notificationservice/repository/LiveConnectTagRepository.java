package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/**
 * Repository for LiveConnect tag definitions.
 */
public interface LiveConnectTagRepository extends JpaRepository<LiveConnectTag, UUID> {

    /**
     * Finds all tags for a project, ordered alphabetically.
     */
    @Query("SELECT t FROM LiveConnectTag t WHERE t.project.id = :projectId ORDER BY t.name ASC")
    List<LiveConnectTag> findByProjectIdOrderByNameAsc(UUID projectId);

    /**
     * Checks if a tag name already exists for a project.
     */
    @Query("SELECT COUNT(t) > 0 FROM LiveConnectTag t WHERE t.project.id = :projectId AND t.name = :name")
    boolean existsByProjectIdAndName(UUID projectId, String name);
}
