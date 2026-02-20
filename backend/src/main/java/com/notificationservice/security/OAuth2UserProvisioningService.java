package com.notificationservice.security;

import com.notificationservice.entity.*;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.UserIdentityRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Shared service for provisioning users from OAuth2/OIDC providers.
 * Handles find-or-create-or-link logic for all providers.
 */
@Service
@RequiredArgsConstructor
public class OAuth2UserProvisioningService {

    private final UserRepository userRepository;
    private final UserIdentityRepository userIdentityRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    /**
     * Provisions a user for the given OAuth provider.
     * Finds an existing identity, links to an existing user by email, or creates a new user.
     *
     * @param provider the OAuth provider
     * @param attributes the OAuth user attributes
     */
    @Transactional
    public void provisionUser(AuthProvider provider, Map<String, Object> attributes) {
        OAuth2UserInfo userInfo = extractUserInfo(provider, attributes);

        Optional<UserIdentity> existingIdentity = userIdentityRepository
                .findByProviderAndProviderUserId(provider, userInfo.providerUserId());

        if (existingIdentity.isPresent()) {
            // Identity exists - update user profile
            User user = existingIdentity.get().getUser();
            user.setUsername(userInfo.username());
            if (userInfo.email() != null) user.setEmail(userInfo.email());
            if (userInfo.avatarUrl() != null) user.setAvatarUrl(userInfo.avatarUrl());
            if (userInfo.firstName() != null) user.setFirstName(userInfo.firstName());
            if (userInfo.lastName() != null) user.setLastName(userInfo.lastName());
            userRepository.save(user);
        } else if (userInfo.email() != null) {
            Optional<User> existingUser = userRepository.findByEmail(userInfo.email());

            if (existingUser.isPresent()) {
                // ACCOUNT LINKING: User exists with this email - link new identity
                User user = existingUser.get();
                userIdentityRepository.save(UserIdentity.builder()
                        .user(user)
                        .provider(provider)
                        .providerUserId(userInfo.providerUserId())
                        .email(userInfo.email())
                        .build());
                if (userInfo.avatarUrl() != null && user.getAvatarUrl() == null) {
                    user.setAvatarUrl(userInfo.avatarUrl());
                }
                if (userInfo.firstName() != null && user.getFirstName() == null) {
                    user.setFirstName(userInfo.firstName());
                }
                if (userInfo.lastName() != null && user.getLastName() == null) {
                    user.setLastName(userInfo.lastName());
                }
                userRepository.save(user);
            } else {
                createNewUserWithOrg(userInfo, provider);
            }
        } else {
            createNewUserWithOrg(userInfo, provider);
        }
    }

    /**
     * Extracts user info from OAuth attributes based on provider.
     * Each provider uses different attribute names.
     *
     * @param provider the OAuth provider
     * @param attributes the raw OAuth attributes
     * @return extracted user info
     */
    private OAuth2UserInfo extractUserInfo(AuthProvider provider, Map<String, Object> attributes) {
        return switch (provider) {
            case GITHUB -> new OAuth2UserInfo(
                    String.valueOf(attributes.get("id")),
                    (String) attributes.get("login"),
                    null,
                    null,
                    (String) attributes.get("email"),
                    (String) attributes.get("avatar_url")
            );
            case GOOGLE -> new OAuth2UserInfo(
                    (String) attributes.get("sub"),
                    (String) attributes.get("name"),
                    (String) attributes.get("given_name"),
                    (String) attributes.get("family_name"),
                    (String) attributes.get("email"),
                    (String) attributes.get("picture")
            );
            case APPLE -> new OAuth2UserInfo(
                    (String) attributes.get("sub"),
                    (String) attributes.getOrDefault("email", "Apple User"),
                    null,
                    null,
                    (String) attributes.get("email"),
                    null
            );
            case EMAIL -> throw new IllegalArgumentException("EMAIL provider not supported for OAuth2");
        };
    }

    /**
     * Creates a new user with a personal organization.
     *
     * @param userInfo the extracted user info
     * @param provider the OAuth provider
     */
    private void createNewUserWithOrg(OAuth2UserInfo userInfo, AuthProvider provider) {
        User newUser = userRepository.save(User.builder()
                .username(userInfo.username())
                .firstName(userInfo.firstName())
                .lastName(userInfo.lastName())
                .email(userInfo.email())
                .avatarUrl(userInfo.avatarUrl())
                .build());

        userIdentityRepository.save(UserIdentity.builder()
                .user(newUser)
                .provider(provider)
                .providerUserId(userInfo.providerUserId())
                .email(userInfo.email())
                .build());

        String slug = generateUniqueSlug(userInfo.username());
        Organization personalOrg = organizationRepository.save(Organization.builder()
                .name(userInfo.username() + "'s Projects")
                .slug(slug)
                .owner(newUser)
                .isPersonal(true)
                .build());

        organizationMemberRepository.save(OrganizationMember.builder()
                .organization(personalOrg)
                .user(newUser)
                .role(OrgRole.OWNER)
                .build());
    }

    /**
     * Generates a unique slug from a username.
     *
     * @param username the username to derive the slug from
     * @return a unique slug
     */
    private String generateUniqueSlug(String username) {
        String baseSlug = username.toLowerCase().replaceAll("[^a-z0-9]", "-");
        String slug = baseSlug;
        int counter = 1;
        while (organizationRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }
        return slug;
    }

    /**
     * Provider-agnostic user info extracted from OAuth attributes.
     *
     * @param providerUserId the user's ID at the provider
     * @param username the user's display name / username
     * @param firstName the user's first name (nullable)
     * @param lastName the user's last name (nullable)
     * @param email the user's email (nullable)
     * @param avatarUrl the user's avatar URL (nullable)
     */
    private record OAuth2UserInfo(
            String providerUserId,
            String username,
            String firstName,
            String lastName,
            String email,
            String avatarUrl
    ) {}
}
