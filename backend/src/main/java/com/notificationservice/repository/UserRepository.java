package com.notificationservice.repository;

import com.notificationservice.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email) AND u.deletedAt IS NULL")
    Optional<User> findByEmailIgnoreCase(String email);

    @Query("SELECT u FROM User u WHERE u.username = :username AND u.deletedAt IS NULL")
    Optional<User> findByUsername(String username);

    /**
     * Finds a user by email including soft-deleted accounts.
     * Used during auth flow to detect accounts pending deletion.
     * @param email the email to search
     * @return the user if found (regardless of deletion status)
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmailIgnoreCaseIncludingDeleted(String email);

    /**
     * Finds users whose deletedAt is before the given threshold (eligible for purge).
     * @param threshold the cutoff date
     * @return list of users to purge
     */
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NOT NULL AND u.deletedAt < :threshold")
    List<User> findUsersEligibleForPurge(OffsetDateTime threshold);

    /**
     * Searches users by username, email, first name, or last name,
     * excluding members of the specified organization, users with pending invitations,
     * and soft-deleted users.
     *
     * @param query the search term (matched case-insensitively)
     * @param excludeOrgId the organization ID whose members and pending invitees to exclude
     * @param pageable pagination info (limit results)
     * @return list of matching users
     */
    @Query("""
            SELECT u FROM User u
            WHERE u.deletedAt IS NULL
            AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :query, '%')))
            AND u.id NOT IN (
                SELECT om.user.id FROM OrganizationMember om WHERE om.organization.id = :excludeOrgId
            )
            AND u.id NOT IN (
                SELECT oi.invitee.id FROM OrganizationInvitation oi
                WHERE oi.organization.id = :excludeOrgId AND oi.status = com.notificationservice.entity.InvitationStatus.PENDING
            )
            ORDER BY u.username ASC
            """)
    List<User> searchUsersExcludingOrg(String query, UUID excludeOrgId, Pageable pageable);
}
