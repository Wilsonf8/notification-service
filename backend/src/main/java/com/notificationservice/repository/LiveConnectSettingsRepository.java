package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect settings.
 */
public interface LiveConnectSettingsRepository extends JpaRepository<LiveConnectSettings, UUID> {

    @Query("SELECT s FROM LiveConnectSettings s WHERE s.projectId = :projectId")
    Optional<LiveConnectSettings> findByProjectId(UUID projectId);
}
