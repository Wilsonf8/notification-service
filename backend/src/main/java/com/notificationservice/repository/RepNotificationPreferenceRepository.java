package com.notificationservice.repository;

import com.notificationservice.entity.RepNotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
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

    /**
     * Finds notification preferences for multiple reps in a single query.
     * Used to avoid N+1 queries when sending push notifications to multiple reps.
     *
     * @param repIds the rep IDs
     * @return list of preferences for the given reps
     */
    @Query("SELECT p FROM RepNotificationPreference p WHERE p.rep.id IN :repIds")
    List<RepNotificationPreference> findByRepIds(Collection<UUID> repIds);

    /**
     * Deletes notification preferences for all given rep IDs.
     * @param repIds the rep IDs to delete preferences for
     */
    @Modifying
    @Query("DELETE FROM RepNotificationPreference p WHERE p.rep.id IN :repIds")
    void deleteByRepIds(Collection<UUID> repIds);
}
