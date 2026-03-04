package com.notificationservice.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.BadJOSEException;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.text.ParseException;
import java.util.Date;

/**
 * Verifies Apple identity tokens (JWTs) against Apple's public keys.
 * Apple's JWKS endpoint: https://appleid.apple.com/auth/keys
 */
@Slf4j
@Component
public class AppleTokenVerifier {

    private static final String APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";

    @Value("${oauth.apple.client-id:}")
    private String expectedAudience;

    private volatile JWKSet cachedJWKSet;
    private volatile long cacheTimestamp;
    private static final long CACHE_DURATION_MS = 3600_000; // 1 hour

    /**
     * Verifies an Apple identity token and extracts claims.
     *
     * @param identityToken the Apple identity token (JWT string)
     * @return extracted claims from the verified token
     * @throws AppleTokenException if verification fails
     */
    public AppleTokenClaims verify(String identityToken) {
        try {
            JWKSet jwkSet = getAppleJWKSet();

            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            JWKSource<SecurityContext> keySource = new ImmutableJWKSet<>(jwkSet);
            JWSKeySelector<SecurityContext> keySelector = new JWSVerificationKeySelector<>(
                    JWSAlgorithm.RS256, keySource
            );
            processor.setJWSKeySelector(keySelector);

            JWTClaimsSet claims = processor.process(identityToken, null);

            // Validate issuer
            if (!APPLE_ISSUER.equals(claims.getIssuer())) {
                throw new AppleTokenException("Invalid issuer: " + claims.getIssuer());
            }

            // Validate audience if configured
            if (expectedAudience != null && !expectedAudience.isBlank()
                    && !claims.getAudience().contains(expectedAudience)) {
                throw new AppleTokenException("Invalid audience: " + claims.getAudience());
            }

            // Validate expiration
            if (claims.getExpirationTime() != null && claims.getExpirationTime().before(new Date())) {
                throw new AppleTokenException("Token expired");
            }

            String sub = claims.getSubject();
            String email = claims.getStringClaim("email");
            Boolean emailVerified = claims.getBooleanClaim("email_verified");

            log.info("Apple token verified - sub: {}, email: {}", sub, email != null ? "***" : "null");

            return new AppleTokenClaims(sub, email, Boolean.TRUE.equals(emailVerified));

        } catch (ParseException | BadJOSEException | JOSEException e) {
            log.error("Apple token verification failed: {}", e.getMessage());
            throw new AppleTokenException("Invalid Apple identity token: " + e.getMessage());
        }
    }

    /**
     * Fetches Apple's JWKS with caching.
     *
     * @return the Apple JWK Set
     */
    private JWKSet getAppleJWKSet() {
        long now = System.currentTimeMillis();
        if (cachedJWKSet != null && (now - cacheTimestamp) < CACHE_DURATION_MS) {
            return cachedJWKSet;
        }

        try {
            cachedJWKSet = JWKSet.load(URI.create(APPLE_JWKS_URL).toURL());
            cacheTimestamp = now;
            return cachedJWKSet;
        } catch (IOException | ParseException e) {
            log.error("Failed to fetch Apple JWKS: {}", e.getMessage());
            if (cachedJWKSet != null) {
                log.warn("Using stale Apple JWKS cache");
                return cachedJWKSet;
            }
            throw new AppleTokenException("Failed to fetch Apple public keys: " + e.getMessage());
        }
    }

    /**
     * Claims extracted from a verified Apple identity token.
     *
     * @param sub the Apple user identifier (stable across sign-ins)
     * @param email the user's email (may be a private relay address)
     * @param emailVerified whether Apple has verified the email
     */
    public record AppleTokenClaims(String sub, String email, boolean emailVerified) {}

    /**
     * Exception thrown when Apple token verification fails.
     */
    public static class AppleTokenException extends RuntimeException {
        public AppleTokenException(String message) {
            super(message);
        }
    }
}
