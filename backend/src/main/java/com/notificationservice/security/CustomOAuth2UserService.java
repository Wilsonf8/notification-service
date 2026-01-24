package com.notificationservice.security;

import com.notificationservice.entity.*;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.UserIdentityRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final UserIdentityRepository userIdentityRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        Map<String, Object> attributes = oauth2User.getAttributes();
        OAuth2UserInfo userInfo = extractUserInfo(provider, attributes);

        // Check if identity already exists for this provider
        Optional<UserIdentity> existingIdentity = userIdentityRepository
                .findByProviderAndProviderUserId(provider, userInfo.providerUserId());

        if (existingIdentity.isPresent()) {
            // Identity exists - update user profile
            User user = existingIdentity.get().getUser();
            user.setUsername(userInfo.username());
            if (userInfo.email() != null) user.setEmail(userInfo.email());
            if (userInfo.avatarUrl() != null) user.setAvatarUrl(userInfo.avatarUrl());
            userRepository.save(user);
        } else if (userInfo.email() != null) {
            // No identity for this provider - check if user exists with this email
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
                // Update profile if needed
                if (userInfo.avatarUrl() != null && user.getAvatarUrl() == null) {
                    user.setAvatarUrl(userInfo.avatarUrl());
                    userRepository.save(user);
                }
            } else {
                // NEW USER: Create user, identity, and personal org
                createNewUserWithOrg(userInfo, provider);
            }
        } else {
            // No email from provider - create new user (can't link)
            createNewUserWithOrg(userInfo, provider);
        }

        return oauth2User;
    }

    /**
     * Extract user info from OAuth attributes based on provider.
     * Each provider uses different attribute names.
     */
    private OAuth2UserInfo extractUserInfo(AuthProvider provider, Map<String, Object> attributes) {
        return switch (provider) {
            case GITHUB -> new OAuth2UserInfo(
                    String.valueOf(attributes.get("id")),
                    (String) attributes.get("login"),
                    (String) attributes.get("email"),
                    (String) attributes.get("avatar_url")
            );
            case GOOGLE -> new OAuth2UserInfo(
                    (String) attributes.get("sub"),
                    (String) attributes.get("name"),
                    (String) attributes.get("email"),
                    (String) attributes.get("picture")
            );
            case APPLE -> new OAuth2UserInfo(
                    (String) attributes.get("sub"),
                    (String) attributes.getOrDefault("email", "Apple User"),  // Apple may not provide name
                    (String) attributes.get("email"),
                    null  // Apple doesn't provide avatar
            );
            case EMAIL -> throw new IllegalArgumentException("EMAIL provider not supported for OAuth2");
        };
    }

    private void createNewUserWithOrg(OAuth2UserInfo userInfo, AuthProvider provider) {
        // Create new user
        User newUser = userRepository.save(User.builder()
                .username(userInfo.username())
                .email(userInfo.email())
                .avatarUrl(userInfo.avatarUrl())
                .build());

        // Create identity
        userIdentityRepository.save(UserIdentity.builder()
                .user(newUser)
                .provider(provider)
                .providerUserId(userInfo.providerUserId())
                .email(userInfo.email())
                .build());

        // Create personal organization for the user
        String slug = generateUniqueSlug(userInfo.username());
        Organization personalOrg = organizationRepository.save(Organization.builder()
                .name(userInfo.username() + "'s Projects")
                .slug(slug)
                .owner(newUser)
                .isPersonal(true)
                .build());

        // Add user as owner of their personal org
        organizationMemberRepository.save(OrganizationMember.builder()
                .organization(personalOrg)
                .user(newUser)
                .role(OrgRole.OWNER)
                .build());
    }

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
     */
    private record OAuth2UserInfo(
            String providerUserId,
            String username,
            String email,
            String avatarUrl
    ) {}
}
