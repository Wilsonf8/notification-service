package com.notificationservice.repository;

import com.notificationservice.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    Optional<Organization> findBySlug(String slug);

    @Query("SELECT o FROM Organization o WHERE o.owner.id = :userId AND o.isPersonal = true")
    Optional<Organization> findPersonalOrgByUserId(UUID userId);

    @Query("SELECT o FROM Organization o JOIN o.members m WHERE m.user.id = :userId")
    List<Organization> findAllByMemberUserId(UUID userId);

    boolean existsBySlug(String slug);
}
