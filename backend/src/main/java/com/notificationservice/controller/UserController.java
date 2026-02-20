package com.notificationservice.controller;

import com.notificationservice.dto.UserSearchResultDto;
import com.notificationservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for user operations.
 * Provides user search functionality for the invitation system.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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
}
