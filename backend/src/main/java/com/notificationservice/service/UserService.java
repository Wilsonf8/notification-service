package com.notificationservice.service;

import com.notificationservice.dto.UserSearchResultDto;
import com.notificationservice.entity.User;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for user-related operations such as searching users.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Searches users by username, email, first name, or last name,
     * excluding members of the specified organization.
     *
     * @param query the search term (minimum 2 characters)
     * @param excludeOrgId the organization ID whose members to exclude
     * @return list of matching users (max 8 results)
     * @throws IllegalArgumentException if query is less than 2 characters
     */
    @Transactional(readOnly = true)
    public List<UserSearchResultDto> searchUsers(String query, UUID excludeOrgId) {
        if (query == null || query.trim().length() < 2) {
            throw new IllegalArgumentException("Search query must be at least 2 characters");
        }

        List<User> users = userRepository.searchUsersExcludingOrg(
                query.trim(), excludeOrgId, PageRequest.of(0, 8));

        return users.stream()
                .map(this::toSearchResult)
                .toList();
    }

    /**
     * Converts a User entity to a search result DTO.
     *
     * @param user the user entity
     * @return the search result DTO
     */
    private UserSearchResultDto toSearchResult(User user) {
        return new UserSearchResultDto(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getAvatarUrl()
        );
    }
}
