package com.notificationservice.security;

import com.notificationservice.entity.AuthProvider;
import com.notificationservice.repository.UserIdentityRepository;
import jakarta.servlet.http.Cookie;
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

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * Handles successful OAuth2 authentication.
 * Generates a JWT token and redirects back to the frontend with the token.
 * Supports dynamic redirect origins for multiple frontend environments.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider tokenProvider;
    private final UserIdentityRepository userIdentityRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.allowed-origins:}")
    private String allowedOriginsConfig;

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

        // Check if this is a mobile client request
        boolean isMobile = isMobileRequest(request);
        log.info("OAuth success - isMobile: {}, sessionId: {}", isMobile,
                request.getSession(false) != null ? request.getSession().getId() : "no session");

        String targetUrl;
        if (isMobile) {
            // Redirect to iOS app via custom URL scheme
            targetUrl = UriComponentsBuilder.fromUriString("liveconnect://auth/callback")
                    .queryParam("token", token)
                    .build().toUriString();
        } else {
            // Determine redirect URL from cookie or fall back to default
            String redirectOrigin = getRedirectOriginFromCookie(request);
            String baseUrl = isAllowedOrigin(redirectOrigin) ? redirectOrigin : frontendUrl;

            // Clear the cookie
            clearRedirectCookie(response);

            targetUrl = UriComponentsBuilder.fromUriString(baseUrl + "/auth/callback")
                    .queryParam("token", token)
                    .build().toUriString();
        }

        log.info("OAuth redirecting to: {}", targetUrl);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    /**
     * Checks if the request originated from a mobile client.
     * Looks for mobile=true in session attribute (set during OAuth initiation).
     */
    private boolean isMobileRequest(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            Object mobileAttr = session.getAttribute("oauth_mobile");
            if (Boolean.TRUE.equals(mobileAttr)) {
                session.removeAttribute("oauth_mobile");
                return true;
            }
        }
        return false;
    }

    /**
     * Extracts the provider-specific user ID from OAuth2 attributes.
     */
    private String extractProviderUserId(AuthProvider provider, OAuth2User oauth2User) {
        var attributes = oauth2User.getAttributes();
        return switch (provider) {
            case GITHUB -> String.valueOf(attributes.get("id"));
            case GOOGLE, APPLE -> (String) attributes.get("sub");
            case EMAIL -> throw new IllegalArgumentException("EMAIL provider not supported for OAuth2");
        };
    }

    /**
     * Reads the redirect origin from the cookie set by OAuth2RedirectFilter.
     */
    private String getRedirectOriginFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;

        return Arrays.stream(request.getCookies())
                .filter(c -> OAuth2RedirectFilter.REDIRECT_ORIGIN_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    /**
     * Validates that the origin is in the allowed list.
     */
    private boolean isAllowedOrigin(String origin) {
        if (origin == null || origin.isBlank()) return false;

        List<String> allowedOrigins = Arrays.asList(allowedOriginsConfig.split(","));
        return allowedOrigins.stream()
                .map(String::trim)
                .anyMatch(allowed -> allowed.equalsIgnoreCase(origin));
    }

    /**
     * Clears the redirect origin cookie after use.
     */
    private void clearRedirectCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(OAuth2RedirectFilter.REDIRECT_ORIGIN_COOKIE, "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
