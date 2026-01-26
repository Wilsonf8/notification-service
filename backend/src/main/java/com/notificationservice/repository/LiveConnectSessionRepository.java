package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect sessions.
 */
public interface LiveConnectSessionRepository extends JpaRepository<LiveConnectSession, UUID> {

    @Query("SELECT s FROM LiveConnectSession s WHERE s.sessionToken = :sessionToken AND s.expiresAt > :now")
    Optional<LiveConnectSession> findBySessionTokenAndNotExpired(String sessionToken, OffsetDateTime now);

    @Query("SELECT s FROM LiveConnectSession s WHERE s.sessionToken = :sessionToken")
    Optional<LiveConnectSession> findBySessionToken(String sessionToken);

    @Modifying
    @Query("DELETE FROM LiveConnectSession s WHERE s.expiresAt < :now")
    int deleteExpired(OffsetDateTime now);
}
