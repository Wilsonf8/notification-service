package com.notificationservice.service;

import com.eatthepath.pushy.apns.ApnsClient;
import com.eatthepath.pushy.apns.PushNotificationResponse;
import com.eatthepath.pushy.apns.util.ApnsPayloadBuilder;
import com.eatthepath.pushy.apns.util.SimpleApnsPayloadBuilder;
import com.eatthepath.pushy.apns.util.SimpleApnsPushNotification;
import com.eatthepath.pushy.apns.util.TokenUtil;
import com.notificationservice.entity.DeviceToken;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.RepNotificationPreference;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.RepNotificationPreferenceRepository;
import com.notificationservice.websocket.session.RepSessionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for sending push notifications to iOS devices.
 * Handles visitor presence and visitor request notifications.
 */
@Service
@Slf4j
public class PushNotificationService {

    private final ApnsClient apnsClient;
    private final DeviceTokenService deviceTokenService;
    private final LiveConnectRepRepository repRepository;
    private final RepNotificationPreferenceRepository preferenceRepository;
    private final RepSessionManager repSessionManager;
    private final StringRedisTemplate redisTemplate;

    /**
     * Constructor with optional ApnsClient injection.
     * APNs client may be null if not configured (development mode).
     */
    @Autowired
    public PushNotificationService(
            @Nullable ApnsClient apnsClient,
            DeviceTokenService deviceTokenService,
            LiveConnectRepRepository repRepository,
            RepNotificationPreferenceRepository preferenceRepository,
            RepSessionManager repSessionManager,
            StringRedisTemplate redisTemplate) {
        this.apnsClient = apnsClient;
        this.deviceTokenService = deviceTokenService;
        this.repRepository = repRepository;
        this.preferenceRepository = preferenceRepository;
        this.repSessionManager = repSessionManager;
        this.redisTemplate = redisTemplate;
    }

    @Value("${app.apns.bundle-id:com.liveconnect.LiveConnect}")
    private String bundleId;

    @Value("${app.push.presence-throttle-minutes:30}")
    private int presenceThrottleMinutes;

    /**
     * Sends visitor presence notifications to available reps.
     * Throttled per visitor to avoid notification spam.
     *
     * @param projectId the project ID
     * @param visitor the visitor that joined
     */
    @Async
    public void sendVisitorPresenceNotification(UUID projectId, LiveConnectVisitor visitor) {
        if (apnsClient == null) {
            log.debug("APNs client not configured, skipping presence notification");
            return;
        }

        // Check throttle - only send one presence notification per visitor per throttle period
        String throttleKey = "push:presence:" + visitor.getId();
        if (Boolean.TRUE.equals(redisTemplate.hasKey(throttleKey))) {
            log.debug("Presence notification throttled for visitor {}", visitor.getId());
            return;
        }

        // Set throttle
        redisTemplate.opsForValue().set(throttleKey, "1", presenceThrottleMinutes, TimeUnit.MINUTES);

        // Get available reps for project (AVAILABLE status, not in call)
        List<LiveConnectRep> reps = repRepository.findAvailableByProjectId(projectId);

        for (LiveConnectRep rep : reps) {
            // Skip if rep has active WebSocket sessions (they'll get real-time event)
            if (repSessionManager.hasActiveSessions(rep.getUser().getId())) {
                log.debug("Skipping push for rep {} - has active sessions", rep.getId());
                continue;
            }

            // Check rep's notification preferences
            RepNotificationPreference pref = preferenceRepository.findByRepId(rep.getId())
                    .orElse(null);
            if (pref != null && !pref.getNotifyVisitorPresence()) {
                log.debug("Skipping push for rep {} - presence notifications disabled", rep.getId());
                continue;
            }

            // Send push to all of rep's devices
            sendVisitorPresenceToUser(rep.getUser().getId(), visitor, projectId);
        }
    }

    /**
     * Sends visitor request notifications to available reps.
     *
     * @param projectId the project ID
     * @param request the incoming request
     */
    @Async
    public void sendVisitorRequestNotification(UUID projectId, LiveConnectRequest request) {
        if (apnsClient == null) {
            log.debug("APNs client not configured, skipping request notification");
            return;
        }

        LiveConnectVisitor visitor = request.getVisitor();

        // Get available reps for project
        List<LiveConnectRep> reps = repRepository.findAvailableByProjectId(projectId);

        for (LiveConnectRep rep : reps) {
            // Skip if rep has active WebSocket sessions
            if (repSessionManager.hasActiveSessions(rep.getUser().getId())) {
                log.debug("Skipping push for rep {} - has active sessions", rep.getId());
                continue;
            }

            // Check rep's notification preferences
            RepNotificationPreference pref = preferenceRepository.findByRepId(rep.getId())
                    .orElse(null);
            if (pref != null && !pref.getNotifyVisitorRequest()) {
                log.debug("Skipping push for rep {} - request notifications disabled", rep.getId());
                continue;
            }

            // Send push to all of rep's devices
            sendVisitorRequestToUser(rep.getUser().getId(), visitor, request.getId(), projectId);
        }
    }

    private void sendVisitorPresenceToUser(UUID userId, LiveConnectVisitor visitor, UUID projectId) {
        List<DeviceToken> tokens = deviceTokenService.getValidTokensForUser(userId);
        if (tokens.isEmpty()) {
            log.debug("No device tokens for user {}", userId);
            return;
        }

        String visitorName = visitor.getName() != null ? visitor.getName() : "A visitor";
        String currentPage = extractCurrentPage(visitor);
        String body = currentPage != null
                ? visitorName + " is browsing " + currentPage
                : visitorName + " is on your site";

        ApnsPayloadBuilder payloadBuilder = new SimpleApnsPayloadBuilder()
                .setAlertTitle("Visitor on Site")
                .setAlertBody(body)
                .setSound("default")
                .addCustomProperty("type", "visitor_presence")
                .addCustomProperty("projectId", projectId.toString())
                .addCustomProperty("visitorId", visitor.getId().toString());

        String payload = payloadBuilder.build();

        for (DeviceToken token : tokens) {
            sendPush(token.getDeviceToken(), payload, token.getBundleId());
        }
    }

    private void sendVisitorRequestToUser(UUID userId, LiveConnectVisitor visitor, UUID requestId, UUID projectId) {
        List<DeviceToken> tokens = deviceTokenService.getValidTokensForUser(userId);
        if (tokens.isEmpty()) {
            log.debug("No device tokens for user {}", userId);
            return;
        }

        String visitorName = visitor.getName() != null ? visitor.getName() : "A visitor";

        ApnsPayloadBuilder payloadBuilder = new SimpleApnsPayloadBuilder()
                .setAlertTitle("Call Request")
                .setAlertBody(visitorName + " wants to talk")
                .setSound("default")
                .addCustomProperty("type", "visitor_request")
                .addCustomProperty("projectId", projectId.toString())
                .addCustomProperty("requestId", requestId.toString());

        String payload = payloadBuilder.build();

        for (DeviceToken token : tokens) {
            sendPush(token.getDeviceToken(), payload, token.getBundleId());
        }
    }

    private void sendPush(String deviceToken, String payload, String tokenBundleId) {
        try {
            String topic = tokenBundleId != null ? tokenBundleId : bundleId;
            SimpleApnsPushNotification notification = new SimpleApnsPushNotification(
                    TokenUtil.sanitizeTokenString(deviceToken),
                    topic,
                    payload,
                    Instant.now().plusSeconds(3600), // 1 hour expiry
                    null, // delivery priority
                    null  // collapse ID
            );

            apnsClient.sendNotification(notification).whenComplete((response, error) -> {
                if (error != null) {
                    log.error("Failed to send push notification: {}", error.getMessage());
                } else if (!response.isAccepted()) {
                    log.warn("Push notification rejected: {} - {}",
                            response.getRejectionReason().orElse("unknown"),
                            deviceToken.substring(0, Math.min(8, deviceToken.length())));

                    // Invalidate token if it's no longer valid
                    String reason = response.getRejectionReason().orElse("");
                    if (reason.equals("BadDeviceToken") || reason.equals("Unregistered")) {
                        deviceTokenService.invalidateToken(deviceToken);
                    }
                } else {
                    log.debug("Push notification sent successfully");
                }
            });
        } catch (Exception e) {
            log.error("Error sending push notification: {}", e.getMessage());
        }
    }

    @Nullable
    private String extractCurrentPage(LiveConnectVisitor visitor) {
        if (visitor.getMetadata() != null) {
            Object page = visitor.getMetadata().get("currentPage");
            if (page != null) {
                String url = page.toString();
                // Extract just the path for brevity
                try {
                    java.net.URI uri = new java.net.URI(url);
                    return uri.getPath();
                } catch (Exception e) {
                    return url;
                }
            }
        }
        return null;
    }
}
