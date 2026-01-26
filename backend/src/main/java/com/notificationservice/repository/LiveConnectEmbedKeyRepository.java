package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectEmbedKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect embed keys.
 */
public interface LiveConnectEmbedKeyRepository extends JpaRepository<LiveConnectEmbedKey, UUID> {

    @Query("SELECT k FROM LiveConnectEmbedKey k WHERE k.project.id = :projectId AND k.isRevoked = false")
    List<LiveConnectEmbedKey> findActiveByProjectId(UUID projectId);

    @Query("SELECT k FROM LiveConnectEmbedKey k WHERE k.project.id = :projectId")
    List<LiveConnectEmbedKey> findByProjectId(UUID projectId);

    @Query("SELECT k FROM LiveConnectEmbedKey k WHERE k.keyHash = :keyHash AND k.isRevoked = false")
    Optional<LiveConnectEmbedKey> findByKeyHashAndNotRevoked(String keyHash);
}
