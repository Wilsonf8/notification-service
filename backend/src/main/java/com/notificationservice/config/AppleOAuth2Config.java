package com.notificationservice.config;

import com.notificationservice.security.AppleClientSecretGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.endpoint.RestClientAuthorizationCodeTokenResponseClient;

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
    public OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> accessTokenResponseClient() {
        RestClientAuthorizationCodeTokenResponseClient client =
                new RestClientAuthorizationCodeTokenResponseClient();

        client.setParametersCustomizer(parameters -> {
            // Replace the placeholder client_secret with a freshly generated JWT for Apple.
            // Uses the registration's client_id (Services ID) as the JWT subject,
            // which differs from the iOS bundle ID in oauth.apple.client-id.
            if (parameters.containsKey("client_secret")
                    && "placeholder-replaced-at-runtime".equals(parameters.getFirst("client_secret"))
                    && appleClientSecretGenerator.isConfigured()) {
                String webClientId = parameters.getFirst("client_id");
                parameters.set("client_secret", appleClientSecretGenerator.generateSecret(webClientId));
            }
        });

        return client;
    }
}