package com.notificationservice.repository;

import com.notificationservice.entity.RepNotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for rep notification preferences.
 */
public interface RepNotificationPreferenceRepository extends JpaRepository<RepNotificationPreference, UUID> {

    /**
     * Finds notification preferences by rep ID.
     *
     * @param repId the rep ID
     * @return the preferences if found
     */
    @Query("SELECT p FROM RepNotificationPreference p WHERE p.rep.id = :repId")
    Optional<RepNotificationPreference> findByRepId(UUID repId);

    /**
     * Deletes preferences by rep ID.
     *
     * @param repId the rep ID
     */
    void deleteByRepId(UUID repId);
}
