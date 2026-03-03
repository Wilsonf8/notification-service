package com.notificationservice.repository;

import com.notificationservice.entity.OrganizationMember;
import com.notificationservice.entity.OrgRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {
    List<OrganizationMember> findByOrganizationId(UUID organizationId);

    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    /**
     * Counts members for an organization.
     * @param organizationId the organization ID
     * @return number of members
     */
    long countByOrganizationId(UUID organizationId);

    @Query("SELECT m FROM OrganizationMember m WHERE m.organization.id = :orgId AND m.role = :role")
    List<OrganizationMember> findByOrganizationIdAndRole(UUID orgId, OrgRole role);

    /**
     * Finds all memberships for a user across all organizations.
     * Used during account deletion to clean up team memberships.
     * @param userId the user's ID
     * @return all organization memberships for the user
     */
    List<OrganizationMember> findByUserId(UUID userId);
}
