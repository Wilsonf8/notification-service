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

    @Query("SELECT m FROM OrganizationMember m WHERE m.organization.id = :orgId AND m.role = :role")
    List<OrganizationMember> findByOrganizationIdAndRole(UUID orgId, OrgRole role);
}
