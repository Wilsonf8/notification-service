package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.RequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveConnect requests.
 */
public interface LiveConnectRequestRepository extends JpaRepository<LiveConnectRequest, UUID> {

    /**
     * Finds a request by ID with a pessimistic write lock (SELECT ... FOR UPDATE).
     * Blocks concurrent transactions until the lock holder commits, preventing
     * race conditions when two reps accept the same request simultaneously.
     *
     * @param id the request ID
     * @return the locked request, if found
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM LiveConnectRequest r WHERE r.id = :id")
    Optional<LiveConnectRequest> findByIdForUpdate(UUID id);

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.project.id = :projectId AND r.status = 'PENDING' ORDER BY r.createdAt ASC")
    List<LiveConnectRequest> findPendingByProjectId(UUID projectId);

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.visitor.id = :visitorId AND r.status = 'PENDING'")
    Optional<LiveConnectRequest> findPendingByVisitorId(UUID visitorId);

    /**
     * Finds all pending REP_TO_USER pings initiated by a specific rep.
     *
     * @param repId the rep's internal ID
     * @return list of pending ping requests
     */
    @Query("SELECT r FROM LiveConnectRequest r WHERE r.initiatedByRep.id = :repId AND r.direction = 'REP_TO_USER' AND r.status = 'PENDING'")
    List<LiveConnectRequest> findPendingPingsByRepId(UUID repId);

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.project.id = :projectId AND r.visitor.id = :visitorId AND r.status = 'PENDING'")
    Optional<LiveConnectRequest> findPendingByProjectIdAndVisitorId(UUID projectId, UUID visitorId);

    @Query("SELECT r FROM LiveConnectRequest r WHERE r.project.id = :projectId AND r.status = :status ORDER BY r.createdAt DESC")
    List<LiveConnectRequest> findByProjectIdAndStatus(UUID projectId, RequestStatus status);

    @Modifying
    @Query("UPDATE LiveConnectRequest r SET r.status = 'EXPIRED' WHERE r.status = 'PENDING' AND r.expiresAt < :now")
    int expirePendingRequests(OffsetDateTime now);

    /**
     * Finds pending requests that have expired (for scheduler to process individually).
     */
    @Query("SELECT r FROM LiveConnectRequest r WHERE r.status = :status AND r.expiresAt < :expiresAtBefore")
    List<LiveConnectRequest> findByStatusAndExpiresAtBefore(RequestStatus status, OffsetDateTime expiresAtBefore);

    /**
     * Counts pings received by a visitor (REP_TO_USER) since a given time.
     *
     * @param visitorId the visitor's internal ID
     * @param since     the start of the time window
     * @return count of pings received
     */
    @Query("SELECT COUNT(r) FROM LiveConnectRequest r WHERE r.visitor.id = :visitorId AND r.direction = 'REP_TO_USER' AND r.createdAt >= :since")
    long countPingsReceivedSince(UUID visitorId, OffsetDateTime since);

    /**
     * Counts requests sent by a visitor (USER_TO_REPS) since a given time.
     *
     * @param visitorId the visitor's internal ID
     * @param since     the start of the time window
     * @return count of requests sent
     */
    @Query("SELECT COUNT(r) FROM LiveConnectRequest r WHERE r.visitor.id = :visitorId AND r.direction = 'USER_TO_REPS' AND r.createdAt >= :since")
    long countRequestsSentSince(UUID visitorId, OffsetDateTime since);

    /**
     * Counts declined or expired pings (REP_TO_USER) for a visitor since a given time.
     *
     * @param visitorId the visitor's internal ID
     * @param since     the start of the time window
     * @return count of declined or expired pings
     */
    @Query("SELECT COUNT(r) FROM LiveConnectRequest r WHERE r.visitor.id = :visitorId "
         + "AND r.direction = 'REP_TO_USER' AND r.status IN ('DECLINED', 'EXPIRED') "
         + "AND r.createdAt >= :since")
    long countDeclinedOrExpiredPingsSince(UUID visitorId, OffsetDateTime since);

    /**
     * Checks if any requests exist for a visitor (any direction, any status).
     *
     * @param visitorId the visitor's internal ID
     * @return true if any requests exist
     */
    @Query("SELECT COUNT(r) > 0 FROM LiveConnectRequest r WHERE r.visitor.id = :visitorId")
    boolean existsAnyByVisitorId(UUID visitorId);

    /**
     * Returns combined interaction stats for a returning visitor in a single query.
     * Combines countRequestsSentSince + countDeclinedOrExpiredPingsSince + existsAnyByVisitorId
     * to reduce 3 DB round-trips to 1.
     * Returns [requestsSentSince (Long), declinedPingsSince (Long), hasAnyRequests (Boolean)].
     *
     * @param visitorId the visitor's internal ID
     * @param since the start of the time window
     * @return Object array with [requestsSent, declinedPings, hasAny]
     */
    @Query("SELECT " +
           "SUM(CASE WHEN r.direction = 'USER_TO_REPS' AND r.createdAt >= :since THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN r.direction = 'REP_TO_USER' AND r.status IN ('DECLINED', 'EXPIRED') AND r.createdAt >= :since THEN 1 ELSE 0 END), " +
           "COUNT(r) > 0 " +
           "FROM LiveConnectRequest r WHERE r.visitor.id = :visitorId")
    Object[] getVisitorRequestStats(UUID visitorId, OffsetDateTime since);
}
