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

    /**
     * Counts active (non-revoked) embed keys for a project.
     * @param projectId the project ID
     * @return number of active embed keys
     */
    @Query("SELECT COUNT(k) FROM LiveConnectEmbedKey k WHERE k.project.id = :projectId AND k.isRevoked = false")
    long countActiveByProjectId(UUID projectId);

    @Query("SELECT k FROM LiveConnectEmbedKey k WHERE k.keyHash = :keyHash AND k.isRevoked = false")
    Optional<LiveConnectEmbedKey> findByKeyHashAndNotRevoked(String keyHash);

    /**
     * Finds an active embed key by its plaintext key value (new keys only).
     * @param keyValue the full key value
     * @return the embed key if found and not revoked
     */
    Optional<LiveConnectEmbedKey> findByKeyValueAndIsRevokedFalse(String keyValue);
}
