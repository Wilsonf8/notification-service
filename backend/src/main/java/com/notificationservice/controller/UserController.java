package com.notificationservice.controller;

import com.notificationservice.dto.DeletionPreflightResponse;
import com.notificationservice.dto.UserSearchResultDto;
import com.notificationservice.entity.User;
import com.notificationservice.repository.UserRepository;
import com.notificationservice.service.AccountDeletionService;
import com.notificationservice.service.ResourceNotFoundException;
import com.notificationservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for user operations.
 * Provides user search and account management functionality.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final AccountDeletionService accountDeletionService;

    /**
     * Searches users by username, email, first name, or last name.
     * Excludes members of the specified organization.
     *
     * @param query the search term (minimum 2 characters)
     * @param excludeOrgId the organization ID whose members to exclude
     * @param userId the authenticated user's ID
     * @return list of matching users (max 8 results)
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResultDto>> searchUsers(
            @RequestParam("q") String query,
            @RequestParam("excludeOrgId") UUID excludeOrgId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(userService.searchUsers(query, excludeOrgId));
    }

    /**
     * Checks for blockers preventing account deletion.
     * Returns a list of team orgs the user owns that must be transferred first.
     *
     * @param userId the authenticated user's ID
     * @return preflight response with any blockers
     */
    @GetMapping("/me/deletion-preflight")
    public ResponseEntity<DeletionPreflightResponse> deletionPreflight(
            @AuthenticationPrincipal UUID userId) {
        User user = findUser(userId);
        var blockers = accountDeletionService.preflightCheck(user);
        return ResponseEntity.ok(new DeletionPreflightResponse(
                blockers.isEmpty(),
                blockers.stream().map(b -> new DeletionPreflightResponse.OrgBlocker(
                        b.organizationId(), b.name(), b.slug()
                )).toList()
        ));
    }

    /**
     * Initiates account soft-deletion.
     * Sets deletedAt, removes team memberships, and starts the 30-day grace period.
     *
     * @param userId the authenticated user's ID
     * @return 204 No Content on success
     */
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal UUID userId) {
        User user = findUser(userId);
        accountDeletionService.softDeleteAccount(user);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reactivates a soft-deleted account during the grace period.
     * Clears deletedAt on the user and personal org.
     *
     * @param userId the authenticated user's ID
     * @return 200 OK on success
     */
    @PostMapping("/me/reactivate")
    public ResponseEntity<Void> reactivateAccount(@AuthenticationPrincipal UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        accountDeletionService.reactivateAccount(user);
        return ResponseEntity.ok().build();
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
