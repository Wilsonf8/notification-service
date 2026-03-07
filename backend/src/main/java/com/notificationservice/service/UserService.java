package com.notificationservice.service;

import com.notificationservice.dto.UpdateProfileRequest;
import com.notificationservice.dto.UserDto;
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
     * Updates the profile (first name, last name) for the given user.
     *
     * @param userId the ID of the user to update
     * @param request the update request containing firstName and lastName
     * @return the updated user as a DTO
     * @throws ResourceNotFoundException if the user is not found or is deleted
     * @throws IllegalArgumentException if firstName or lastName exceeds 50 characters
     */
    @Transactional
    public UserDto updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String firstName = request.firstName() != null ? request.firstName().trim() : null;
        String lastName = request.lastName() != null ? request.lastName().trim() : null;

        if (firstName != null && firstName.length() > 50) {
            throw new IllegalArgumentException("First name must not exceed 50 characters");
        }
        if (lastName != null && lastName.length() > 50) {
            throw new IllegalArgumentException("Last name must not exceed 50 characters");
        }

        // Store empty strings as null for consistency
        user.setFirstName(firstName != null && firstName.isEmpty() ? null : firstName);
        user.setLastName(lastName != null && lastName.isEmpty() ? null : lastName);
        userRepository.save(user);

        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getAvatarUrl()
        );
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
