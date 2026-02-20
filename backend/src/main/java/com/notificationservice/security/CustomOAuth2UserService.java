package com.notificationservice.security;

import com.notificationservice.entity.AuthProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.RequestEntity;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Custom OAuth2 user service for non-OIDC providers (e.g. GitHub).
 * Delegates user provisioning to {@link OAuth2UserProvisioningService}.
 * For GitHub, fetches the primary verified email if not provided in the user attributes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final OAuth2UserProvisioningService provisioningService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        Map<String, Object> attributes = oauth2User.getAttributes();

        // GitHub may not include email in attributes; fetch from /user/emails API
        if (provider == AuthProvider.GITHUB && attributes.get("email") == null) {
            String email = fetchGitHubPrimaryEmail(userRequest.getAccessToken().getTokenValue());
            if (email != null) {
                attributes = new HashMap<>(attributes);
                attributes.put("email", email);
                oauth2User = new DefaultOAuth2User(
                        oauth2User.getAuthorities(),
                        attributes,
                        userRequest.getClientRegistration()
                                .getProviderDetails()
                                .getUserInfoEndpoint()
                                .getUserNameAttributeName()
                );
            }
        }

        provisioningService.provisionUser(provider, oauth2User.getAttributes());

        return oauth2User;
    }

    /**
     * Fetches the primary verified email from GitHub's /user/emails API.
     *
     * @param accessToken the OAuth2 access token
     * @return the primary verified email, or null if not found
     */
    private String fetchGitHubPrimaryEmail(String accessToken) {
        try {
            RequestEntity<Void> request = RequestEntity
                    .get(URI.create("https://api.github.com/user/emails"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .build();

            List<Map<String, Object>> emails = restTemplate.exchange(
                    request,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            ).getBody();

            if (emails != null) {
                return emails.stream()
                        .filter(e -> Boolean.TRUE.equals(e.get("primary"))
                                && Boolean.TRUE.equals(e.get("verified")))
                        .map(e -> (String) e.get("email"))
                        .findFirst()
                        .orElse(null);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch GitHub emails: {}", e.getMessage());
        }
        return null;
    }
}
