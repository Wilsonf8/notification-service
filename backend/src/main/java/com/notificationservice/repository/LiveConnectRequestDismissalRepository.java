package com.notificationservice.repository;

import com.notificationservice.entity.LiveConnectRequestDismissal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Set;
import java.util.UUID;

/**
 * Repository for per-rep request dismissal tracking.
 */
public interface LiveConnectRequestDismissalRepository extends JpaRepository<LiveConnectRequestDismissal, UUID> {

    /**
     * Checks if a rep has already dismissed a specific request.
     *
     * @param requestId the request ID
     * @param repId the rep ID
     * @return true if the dismissal already exists
     */
    boolean existsByRequestIdAndRepId(UUID requestId, UUID repId);

    /**
     * Returns the set of request IDs that a rep has dismissed.
     *
     * @param repId the rep ID
     * @return set of dismissed request IDs
     */
    @Query("SELECT d.request.id FROM LiveConnectRequestDismissal d WHERE d.rep.id = :repId")
    Set<UUID> findDismissedRequestIdsByRepId(UUID repId);
}
