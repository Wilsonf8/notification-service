package com.notificationservice.security;

import com.notificationservice.entity.AuthProvider;
import com.notificationservice.repository.UserIdentityRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider tokenProvider;
    private final UserIdentityRepository userIdentityRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauth2User = oauthToken.getPrincipal();

        String registrationId = oauthToken.getAuthorizedClientRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());
        String providerUserId = extractProviderUserId(provider, oauth2User);

        var identity = userIdentityRepository.findByProviderAndProviderUserId(provider, providerUserId)
                .orElseThrow(() -> new RuntimeException("User identity not found after OAuth"));

        String token = tokenProvider.generateToken(identity.getUser().getId());

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/auth/callback")
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private String extractProviderUserId(AuthProvider provider, OAuth2User oauth2User) {
        var attributes = oauth2User.getAttributes();
        return switch (provider) {
            case GITHUB -> String.valueOf(attributes.get("id"));
            case GOOGLE, APPLE -> (String) attributes.get("sub");
            case EMAIL -> throw new IllegalArgumentException("EMAIL provider not supported for OAuth2");
        };
    }
}
