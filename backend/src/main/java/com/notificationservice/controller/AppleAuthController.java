package com.notificationservice.controller;

import com.notificationservice.entity.AuthProvider;
import com.notificationservice.entity.User;
import com.notificationservice.repository.UserIdentityRepository;
import com.notificationservice.security.AppleTokenVerifier;
import com.notificationservice.security.JwtTokenProvider;
import com.notificationservice.security.OAuth2UserProvisioningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Handles Sign in with Apple token exchange for iOS native authentication.
 * The iOS app uses ASAuthorizationAppleIDProvider to get an identity token,
 * then sends it here for verification and JWT token generation.
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AppleAuthController {

    private final AppleTokenVerifier appleTokenVerifier;
    private final OAuth2UserProvisioningService provisioningService;
    private final UserIdentityRepository userIdentityRepository;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Exchanges an Apple identity token for a backend JWT.
     *
     * @param request the Apple token exchange request containing identity token and optional user info
     * @return JWT token for the authenticated user
     */
    @PostMapping("/apple/token")
    public ResponseEntity<AppleTokenResponse> exchangeAppleToken(@RequestBody AppleTokenRequest request) {
        log.info("Apple token exchange requested");

        // Verify the Apple identity token
        AppleTokenVerifier.AppleTokenClaims claims = appleTokenVerifier.verify(request.identityToken());
        log.info("Apple token verified for sub: {}", claims.sub());

        // Build attributes map matching the format expected by OAuth2UserProvisioningService
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", claims.sub());
        attributes.put("email", claims.email());
        attributes.put("email_verified", claims.emailVerified());

        // Apple only sends name on first sign-in; use it if provided in the request
        if (request.firstName() != null) {
            attributes.put("given_name", request.firstName());
        }
        if (request.lastName() != null) {
            attributes.put("family_name", request.lastName());
        }

        // Provision user (find-or-create-or-link)
        provisioningService.provisionUser(AuthProvider.APPLE, attributes);

        // Look up the user identity to get the user ID
        var identity = userIdentityRepository
                .findByProviderAndProviderUserIdWithUser(AuthProvider.APPLE, claims.sub())
                .orElseThrow(() -> new RuntimeException("User identity not found after Apple provisioning"));

        User user = identity.getUser();
        String token = jwtTokenProvider.generateToken(user.getId());

        boolean pendingDeletion = user.isDeleted();
        String deletionDate = pendingDeletion
                ? user.getDeletedAt().plusDays(30).toInstant().toString()
                : null;

        log.info("Apple auth successful for user: {}", user.getId());

        return ResponseEntity.ok(new AppleTokenResponse(token, pendingDeletion, deletionDate));
    }

    /**
     * Request body for Apple token exchange.
     *
     * @param identityToken the Apple identity token (JWT)
     * @param authorizationCode the Apple authorization code (optional, for server-to-server validation)
     * @param firstName the user's first name (only available on first sign-in)
     * @param lastName the user's last name (only available on first sign-in)
     */
    record AppleTokenRequest(
            String identityToken,
            String authorizationCode,
            String firstName,
            String lastName
    ) {}

    /**
     * Response body for Apple token exchange.
     *
     * @param token the backend JWT token
     * @param pendingDeletion whether the account is pending deletion
     * @param deletionDate the scheduled deletion date, if pending
     */
    record AppleTokenResponse(
            String token,
            boolean pendingDeletion,
            String deletionDate
    ) {}
}
