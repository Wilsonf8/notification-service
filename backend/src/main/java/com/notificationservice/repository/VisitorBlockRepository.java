package com.notificationservice.repository;

import com.notificationservice.entity.VisitorBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for visitor blocks.
 */
public interface VisitorBlockRepository extends JpaRepository<VisitorBlock, UUID> {

    /**
     * Find an existing block for a visitor in a project.
     *
     * @param projectId the project ID
     * @param visitorId the visitor ID
     * @return the block if it exists
     */
    Optional<VisitorBlock> findByProjectIdAndVisitorId(UUID projectId, UUID visitorId);

    /**
     * Check if a visitor is blocked in a project.
     *
     * @param projectId the project ID
     * @param visitorId the visitor ID
     * @return true if blocked
     */
    boolean existsByProjectIdAndVisitorId(UUID projectId, UUID visitorId);
}
