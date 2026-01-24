package com.notificationservice.repository;

import com.notificationservice.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {
    @Query("SELECT ak FROM ApiKey ak WHERE ak.project.id = :projectId AND ak.revokedAt IS NULL")
    List<ApiKey> findActiveByProjectId(UUID projectId);

    @Query("SELECT ak FROM ApiKey ak WHERE ak.keyHash = :keyHash AND ak.revokedAt IS NULL")
    Optional<ApiKey> findByKeyHashAndNotRevoked(String keyHash);
}
