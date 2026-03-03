package com.notificationservice.repository;

import com.notificationservice.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    @Query("SELECT o FROM Organization o WHERE o.slug = :slug AND o.deletedAt IS NULL")
    Optional<Organization> findBySlug(String slug);

    @Query("SELECT o FROM Organization o WHERE o.owner.id = :userId AND o.isPersonal = true AND o.deletedAt IS NULL")
    Optional<Organization> findPersonalOrgByUserId(UUID userId);

    /**
     * Finds the personal org for a user, including soft-deleted orgs.
     * Used during account reactivation.
     * @param userId the user's ID
     * @return the personal org if found
     */
    @Query("SELECT o FROM Organization o WHERE o.owner.id = :userId AND o.isPersonal = true")
    Optional<Organization> findPersonalOrgByUserIdIncludingDeleted(UUID userId);

    @Query("SELECT o FROM Organization o JOIN o.members m WHERE m.user.id = :userId AND o.deletedAt IS NULL")
    List<Organization> findAllByMemberUserId(UUID userId);

    boolean existsBySlug(String slug);
}
