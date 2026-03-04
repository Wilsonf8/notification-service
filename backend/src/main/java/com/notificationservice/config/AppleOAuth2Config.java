package com.notificationservice.config;

import com.notificationservice.security.AppleClientSecretGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.endpoint.DefaultAuthorizationCodeTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequestEntityConverter;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Configures Apple as an OAuth2/OIDC provider for the web-based Sign in with Apple flow.
 * Handles Apple's unique requirement of a dynamically generated client secret (JWT).
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AppleOAuth2Config {

    private final AppleClientSecretGenerator appleClientSecretGenerator;

    /**
     * Creates a custom token response client that injects Apple's dynamic client secret.
     * For non-Apple providers, the default behavior is preserved.
     *
     * @return the customized token response client
     */
    @Bean
    @ConditionalOnProperty(name = "oauth.apple.client-id", matchIfMissing = false)
    public OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> accessTokenResponseClient() {
        DefaultAuthorizationCodeTokenResponseClient client = new DefaultAuthorizationCodeTokenResponseClient();

        OAuth2AuthorizationCodeGrantRequestEntityConverter converter =
                new OAuth2AuthorizationCodeGrantRequestEntityConverter();

        client.setRequestEntityConverter(grantRequest -> {
            var entity = converter.convert(grantRequest);
            String registrationId = grantRequest.getClientRegistration().getRegistrationId();

            if ("apple".equals(registrationId) && appleClientSecretGenerator.isConfigured()) {
                // Replace the client_secret with a freshly generated JWT
                var originalBody = entity.getBody();
                if (originalBody instanceof MultiValueMap<?, ?> originalMap) {
                    MultiValueMap<String, String> newBody = new LinkedMultiValueMap<>();
                    originalMap.forEach((key, values) -> {
                        if ("client_secret".equals(key)) {
                            newBody.add("client_secret", appleClientSecretGenerator.generateSecret());
                        } else {
                            values.forEach(v -> newBody.add((String) key, (String) v));
                        }
                    });
                    return new org.springframework.http.RequestEntity<>(
                            newBody, entity.getHeaders(), entity.getMethod(), entity.getUrl()
                    );
                }
            }

            return entity;
        });

        return client;
    }
}