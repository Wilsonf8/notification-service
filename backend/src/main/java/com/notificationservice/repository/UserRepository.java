package com.notificationservice.repository;

import com.notificationservice.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByUsername(String username);

    /**
     * Searches users by username, email, first name, or last name,
     * excluding members of the specified organization and users with pending invitations.
     *
     * @param query the search term (matched case-insensitively)
     * @param excludeOrgId the organization ID whose members and pending invitees to exclude
     * @param pageable pagination info (limit results)
     * @return list of matching users
     */
    @Query("""
            SELECT u FROM User u
            WHERE (LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
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
