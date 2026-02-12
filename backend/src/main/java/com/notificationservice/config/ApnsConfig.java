package com.notificationservice.config;

import com.eatthepath.pushy.apns.ApnsClient;
import com.eatthepath.pushy.apns.ApnsClientBuilder;
import com.eatthepath.pushy.apns.auth.ApnsSigningKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

/**
 * Configuration for Apple Push Notification service (APNs).
 * Uses pushy library for direct APNs integration.
 * Supports loading key from file path or directly from content.
 */
@Configuration
@Slf4j
public class ApnsConfig {

    static {
        // Force IPv4 for APNs connections (Railway doesn't support IPv6 to Apple servers)
        System.setProperty("java.net.preferIPv4Stack", "true");
    }

    @Value("${app.apns.key-id:}")
    private String keyId;

    @Value("${app.apns.team-id:}")
    private String teamId;

    @Value("${app.apns.key-path:}")
    private String keyPath;

    @Value("${app.apns.key-content:}")
    private String keyContent;

    @Value("${app.apns.production:false}")
    private boolean production;

    /**
     * Creates the APNs client for sending push notifications.
     * Supports loading the signing key from either a file path or direct content.
     * Returns null if APNs is not configured (development mode).
     *
     * @return the APNs client, or null if not configured
     */
    @Bean
    public ApnsClient apnsClient() {
        if (keyId.isEmpty() || teamId.isEmpty()) {
            log.warn("APNs not configured - push notifications disabled. Set APNS_KEY_ID and APNS_TEAM_ID.");
            return null;
        }

        // Need either key content or key path
        if (keyContent.isEmpty() && keyPath.isEmpty()) {
            log.warn("APNs key not provided - set either APNS_KEY_CONTENT or APNS_KEY_PATH.");
            return null;
        }

        try {
            ApnsSigningKey signingKey;

            if (!keyContent.isEmpty()) {
                // Load key from content (environment variable)
                // Convert literal \n to actual newlines (env vars often store them as literals)
                String normalizedKey = keyContent.replace("\\n", "\n");
                InputStream keyInputStream = new ByteArrayInputStream(
                        normalizedKey.getBytes(StandardCharsets.UTF_8)
                );
                signingKey = ApnsSigningKey.loadFromInputStream(keyInputStream, teamId, keyId);
                log.info("Loaded APNs signing key from content");
            } else {
                // Load key from file path
                File keyFile = new File(keyPath);
                if (!keyFile.exists()) {
                    log.error("APNs key file not found at: {}", keyPath);
                    return null;
                }
                signingKey = ApnsSigningKey.loadFromPkcs8File(keyFile, teamId, keyId);
                log.info("Loaded APNs signing key from file: {}", keyPath);
            }

            ApnsClient client = new ApnsClientBuilder()
                    .setApnsServer(production
                            ? ApnsClientBuilder.PRODUCTION_APNS_HOST
                            : ApnsClientBuilder.DEVELOPMENT_APNS_HOST)
                    .setSigningKey(signingKey)
                    .build();

            log.info("APNs client initialized (production={})", production);
            return client;
        } catch (IOException | NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to initialize APNs client: {}", e.getMessage());
            return null;
        }
    }
}
