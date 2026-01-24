package com.notificationservice.repository;

import com.notificationservice.entity.ConnectToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ConnectTokenRepository extends JpaRepository<ConnectToken, UUID> {
    Optional<ConnectToken> findByToken(String token);

    @Modifying
    @Query("DELETE FROM ConnectToken ct WHERE ct.expiresAt < :now OR ct.used = true")
    int deleteExpiredOrUsedTokens(OffsetDateTime now);
}
