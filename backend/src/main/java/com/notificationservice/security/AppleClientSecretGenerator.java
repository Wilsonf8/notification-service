package com.notificationservice.security;

import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

/**
 * Generates Apple client secrets for the web-based Sign in with Apple OAuth flow.
 * Apple requires a JWT signed with your private key instead of a static client secret.
 * The generated JWT is valid for up to 6 months.
 */
@Slf4j
@Component
public class AppleClientSecretGenerator {

    @Value("${oauth.apple.team-id:}")
    private String teamId;

    @Value("${oauth.apple.key-id:}")
    private String keyId;

    @Value("${oauth.apple.client-id:}")
    private String clientId;

    @Value("${oauth.apple.private-key:}")
    private String privateKeyPem;

    private volatile String cachedSecret;
    private volatile Instant cacheExpiry;

    /**
     * Generates (or returns cached) Apple client secret JWT.
     *
     * @return the client secret JWT string
     */
    public String generateSecret() {
        if (cachedSecret != null && Instant.now().isBefore(cacheExpiry)) {
            return cachedSecret;
        }

        try {
            PrivateKey privateKey = loadPrivateKey();
            Instant now = Instant.now();
            // Apple allows up to 6 months; we use 5 months and cache for 4
            Instant expiry = now.plusSeconds(5L * 30 * 24 * 3600);

            String secret = Jwts.builder()
                    .issuer(teamId)
                    .issuedAt(Date.from(now))
                    .expiration(Date.from(expiry))
                    .audience().add("https://appleid.apple.com").and()
                    .subject(clientId)
                    .header().keyId(keyId).and()
                    .signWith(privateKey, Jwts.SIG.ES256)
                    .compact();

            cachedSecret = secret;
            cacheExpiry = now.plusSeconds(4L * 30 * 24 * 3600); // Refresh after 4 months
            log.info("Generated new Apple client secret, expires: {}", expiry);

            return secret;
        } catch (Exception e) {
            log.error("Failed to generate Apple client secret: {}", e.getMessage());
            throw new RuntimeException("Failed to generate Apple client secret", e);
        }
    }

    /**
     * Loads the EC private key from the PEM string.
     *
     * @return the parsed PrivateKey
     * @throws Exception if key parsing fails
     */
    private PrivateKey loadPrivateKey() throws Exception {
        String keyContent = privateKeyPem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("\\n", "")
                .replaceAll("\\s", "");

        byte[] keyBytes = Base64.getDecoder().decode(keyContent);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance("EC");
        return keyFactory.generatePrivate(spec);
    }

    /**
     * Whether Apple OAuth is configured with the required properties.
     *
     * @return true if all required Apple OAuth properties are set
     */
    public boolean isConfigured() {
        return teamId != null && !teamId.isBlank()
                && keyId != null && !keyId.isBlank()
                && clientId != null && !clientId.isBlank()
                && privateKeyPem != null && !privateKeyPem.isBlank();
    }
}