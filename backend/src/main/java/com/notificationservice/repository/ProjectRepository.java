package com.notificationservice.repository;

import com.notificationservice.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    @Query("SELECT p FROM Project p JOIN FETCH p.organization WHERE p.organization.id = :orgId AND p.deletedAt IS NULL")
    List<Project> findByOrganizationIdAndNotDeleted(UUID orgId);

    @Query("SELECT p FROM Project p JOIN FETCH p.organization WHERE p.id = :id AND p.deletedAt IS NULL")
    Optional<Project> findByIdAndNotDeleted(UUID id);

    /**
     * Counts non-deleted projects for an organization.
     * @param orgId the organization ID
     * @return number of active projects
     */
    @Query("SELECT COUNT(p) FROM Project p WHERE p.organization.id = :orgId AND p.deletedAt IS NULL")
    long countByOrganizationIdAndNotDeleted(UUID orgId);

    @Query("SELECT p FROM Project p JOIN FETCH p.organization WHERE p.id = :id AND p.organization.id = :orgId AND p.deletedAt IS NULL")
    Optional<Project> findByIdAndOrganizationIdAndNotDeleted(UUID id, UUID orgId);

    @Query("SELECT p FROM Project p JOIN FETCH p.organization JOIN OrganizationMember m ON m.organization.id = p.organization.id WHERE p.id = :projectId AND m.user.id = :userId AND p.deletedAt IS NULL")
    Optional<Project> findByIdAndUserIdAndNotDeleted(UUID projectId, UUID userId);

    /**
     * Finds all non-deleted projects across all organizations the user is a member of.
     * @param userId the user ID
     * @return list of projects the user has access to
     */
    @Query("SELECT p FROM Project p JOIN FETCH p.organization JOIN OrganizationMember m ON m.organization.id = p.organization.id WHERE m.user.id = :userId AND p.deletedAt IS NULL")
    List<Project> findAllByUserMembershipAndNotDeleted(UUID userId);
}
