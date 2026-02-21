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
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for sending push notifications to iOS devices.
 * Handles visitor presence, visitor request, and contact form notifications.
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
     * @param projectId              the project ID
     * @param visitor                the visitor that joined
     * @param projectName            the project name for notification title, or null
     * @param isFirstVisit           whether this is the visitor's first visit
     * @param totalVisitCount        total number of visits by this visitor
     * @param callsThisWeek          number of video calls in the last 7 days
     * @param requestsThisWeek       number of visitor-initiated requests in the last 7 days
     * @param declinedPingsThisWeek  number of declined/expired rep pings in the last 7 days
     * @param hasAnyInteractions     whether the visitor has any interactions (calls or requests) ever
     */
    @Async
    public void sendVisitorPresenceNotification(
            UUID projectId, LiveConnectVisitor visitor,
            @Nullable String projectName, boolean isFirstVisit,
            long totalVisitCount, long callsThisWeek, long requestsThisWeek,
            long declinedPingsThisWeek, boolean hasAnyInteractions) {
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

        // Get available reps for project (AVAILABLE status, regardless of online/offline)
        List<LiveConnectRep> reps = repRepository.findAvailableForPushByProjectId(projectId);
        log.info("Found {} available reps for push notification in project {}", reps.size(), projectId);

        // Filter out reps with active WebSocket sessions (they get real-time events)
        List<LiveConnectRep> offlineReps = reps.stream()
                .filter(rep -> !repSessionManager.hasActiveSessions(rep.getUser().getId()))
                .toList();

        if (offlineReps.isEmpty()) {
            return;
        }

        // Batch load preferences for all offline reps (N queries → 1)
        Set<UUID> repIds = offlineReps.stream().map(LiveConnectRep::getId).collect(Collectors.toSet());
        Map<UUID, RepNotificationPreference> prefMap = preferenceRepository.findByRepIds(repIds).stream()
                .collect(Collectors.toMap(p -> p.getRep().getId(), Function.identity()));

        // Batch load device tokens for all eligible reps (N queries → 1)
        Set<UUID> eligibleUserIds = offlineReps.stream()
                .filter(rep -> {
                    RepNotificationPreference pref = prefMap.get(rep.getId());
                    return pref == null || pref.getNotifyVisitorPresence();
                })
                .map(rep -> rep.getUser().getId())
                .collect(Collectors.toSet());

        if (eligibleUserIds.isEmpty()) {
            return;
        }

        Map<UUID, List<DeviceToken>> tokenMap = deviceTokenService.getValidTokensForUsers(eligibleUserIds);

        // Send to each eligible rep using pre-loaded tokens
        for (LiveConnectRep rep : offlineReps) {
            RepNotificationPreference pref = prefMap.get(rep.getId());
            if (pref != null && !pref.getNotifyVisitorPresence()) {
                continue;
            }

            List<DeviceToken> tokens = tokenMap.getOrDefault(rep.getUser().getId(), List.of());
            if (tokens.isEmpty()) {
                continue;
            }

            log.info("Sending presence push to rep {} (user {})", rep.getId(), rep.getUser().getId());
            sendVisitorPresenceToTokens(tokens, visitor, projectId, projectName,
                    isFirstVisit, totalVisitCount, callsThisWeek, requestsThisWeek,
                    declinedPingsThisWeek, hasAnyInteractions);
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

        // Get available reps for project (AVAILABLE status, regardless of online/offline)
        List<LiveConnectRep> reps = repRepository.findAvailableForPushByProjectId(projectId);
        log.info("Found {} available reps for push notification in project {}", reps.size(), projectId);

        // Filter out reps with active WebSocket sessions
        List<LiveConnectRep> offlineReps = reps.stream()
                .filter(rep -> !repSessionManager.hasActiveSessions(rep.getUser().getId()))
                .toList();

        if (offlineReps.isEmpty()) {
            return;
        }

        // Batch load preferences and tokens (N+1 → 2 queries)
        Set<UUID> repIds = offlineReps.stream().map(LiveConnectRep::getId).collect(Collectors.toSet());
        Map<UUID, RepNotificationPreference> prefMap = preferenceRepository.findByRepIds(repIds).stream()
                .collect(Collectors.toMap(p -> p.getRep().getId(), Function.identity()));

        Set<UUID> eligibleUserIds = offlineReps.stream()
                .filter(rep -> {
                    RepNotificationPreference pref = prefMap.get(rep.getId());
                    return pref == null || pref.getNotifyVisitorRequest();
                })
                .map(rep -> rep.getUser().getId())
                .collect(Collectors.toSet());

        if (eligibleUserIds.isEmpty()) {
            return;
        }

        Map<UUID, List<DeviceToken>> tokenMap = deviceTokenService.getValidTokensForUsers(eligibleUserIds);

        for (UUID userId : eligibleUserIds) {
            List<DeviceToken> tokens = tokenMap.getOrDefault(userId, List.of());
            if (!tokens.isEmpty()) {
                sendVisitorRequestToTokens(tokens, visitor, request.getId(), projectId);
            }
        }
    }

    /**
     * Sends contact form submission notifications to all reps in the project.
     * Sends to all reps (not just available) since contact forms imply reps are offline.
     *
     * @param projectId      the project ID
     * @param visitorName    the visitor's name from the contact form
     * @param message        the visitor's message
     * @param conversationId the conversation ID for navigation
     * @param projectName    the project name for notification title, or null
     */
    @Async
    public void sendContactFormNotification(UUID projectId, String visitorName, String message,
                                            UUID conversationId, @Nullable String projectName) {
        if (apnsClient == null) {
            log.debug("APNs client not configured, skipping contact form notification");
            return;
        }

        // Get ALL reps for project (not just available, since contact forms imply reps are offline)
        List<LiveConnectRep> reps = repRepository.findByProjectId(projectId);
        log.info("Sending contact form push to {} reps in project {}", reps.size(), projectId);

        // Filter out reps with active WebSocket sessions
        List<LiveConnectRep> offlineReps = reps.stream()
                .filter(rep -> !repSessionManager.hasActiveSessions(rep.getUser().getId()))
                .toList();

        if (offlineReps.isEmpty()) {
            return;
        }

        // Batch load preferences and tokens (N+1 → 2 queries)
        Set<UUID> repIds = offlineReps.stream().map(LiveConnectRep::getId).collect(Collectors.toSet());
        Map<UUID, RepNotificationPreference> prefMap = preferenceRepository.findByRepIds(repIds).stream()
                .collect(Collectors.toMap(p -> p.getRep().getId(), Function.identity()));

        Set<UUID> eligibleUserIds = offlineReps.stream()
                .filter(rep -> {
                    RepNotificationPreference pref = prefMap.get(rep.getId());
                    return pref == null || pref.getNotifyContactForm();
                })
                .map(rep -> rep.getUser().getId())
                .collect(Collectors.toSet());

        if (eligibleUserIds.isEmpty()) {
            return;
        }

        Map<UUID, List<DeviceToken>> tokenMap = deviceTokenService.getValidTokensForUsers(eligibleUserIds);

        for (UUID userId : eligibleUserIds) {
            List<DeviceToken> tokens = tokenMap.getOrDefault(userId, List.of());
            if (!tokens.isEmpty()) {
                sendContactFormToTokens(tokens, visitorName, message, projectId, conversationId, projectName);
            }
        }
    }

    private void sendVisitorPresenceToTokens(List<DeviceToken> tokens, LiveConnectVisitor visitor,
            UUID projectId, @Nullable String projectName, boolean isFirstVisit,
            long totalVisitCount, long callsThisWeek, long requestsThisWeek,
            long declinedPingsThisWeek, boolean hasAnyInteractions) {
        String body = buildPresenceBody(visitor.getName(), extractCurrentPage(visitor),
                isFirstVisit, totalVisitCount, callsThisWeek, requestsThisWeek,
                declinedPingsThisWeek, hasAnyInteractions);

        ApnsPayloadBuilder payloadBuilder = new SimpleApnsPayloadBuilder()
                .setAlertTitle(projectName != null ? projectName : "Visitor on Site")
                .setAlertBody(body)
                .setSound("default")
                .addCustomProperty("type", "visitor_presence")
                .addCustomProperty("projectId", projectId.toString())
                .addCustomProperty("visitorId", visitor.getId().toString())
                .addCustomProperty("isFirstVisit", isFirstVisit)
                .addCustomProperty("totalVisitCount", totalVisitCount);

        String payload = payloadBuilder.build();

        for (DeviceToken token : tokens) {
            sendPush(token.getDeviceToken(), payload, token.getBundleId());
        }
    }

    private void sendVisitorRequestToTokens(List<DeviceToken> tokens, LiveConnectVisitor visitor,
            UUID requestId, UUID projectId) {
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

    private void sendContactFormToTokens(List<DeviceToken> tokens, String visitorName,
            String message, UUID projectId, UUID conversationId, @Nullable String projectName) {
        String title = projectName != null ? projectName : "Contact Form";
        String preview = message.length() > 100 ? message.substring(0, 100) + "..." : message;
        String body = visitorName + ": " + preview;

        ApnsPayloadBuilder payloadBuilder = new SimpleApnsPayloadBuilder()
                .setAlertTitle(title)
                .setAlertBody(body)
                .setSound("default")
                .addCustomProperty("type", "contact_form")
                .addCustomProperty("projectId", projectId.toString())
                .addCustomProperty("conversationId", conversationId.toString());

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
                    com.eatthepath.pushy.apns.DeliveryPriority.IMMEDIATE,
                    com.eatthepath.pushy.apns.PushType.ALERT
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
                    log.info("Push notification sent successfully to {}", deviceToken.substring(0, Math.min(8, deviceToken.length())));
                }
            });
        } catch (Exception e) {
            log.error("Error sending push notification: {}", e.getMessage());
        }
    }

    /**
     * Builds the notification body for visitor presence.
     *
     * @param name                   visitor name, or null if anonymous
     * @param currentPage            current page path, or null
     * @param isFirstVisit           whether this is the visitor's first visit
     * @param totalVisitCount        total visit count
     * @param callsThisWeek          calls in the last 7 days
     * @param requestsThisWeek       visitor-initiated requests in the last 7 days
     * @param declinedPingsThisWeek  declined/expired rep pings in the last 7 days
     * @param hasAnyInteractions     whether any interactions exist ever
     * @return the notification body string
     */
    private String buildPresenceBody(@Nullable String name, @Nullable String currentPage,
            boolean isFirstVisit, long totalVisitCount, long callsThisWeek,
            long requestsThisWeek, long declinedPingsThisWeek, boolean hasAnyInteractions) {
        if (isFirstVisit) {
            if (name != null) {
                return name + " is visiting for the first time";
            }
            return "A first-time visitor is on your site";
        }

        // Returning visitor
        String hint = buildEngagementHint(totalVisitCount, callsThisWeek, requestsThisWeek,
                declinedPingsThisWeek, hasAnyInteractions);

        if (name != null) {
            if (currentPage != null) {
                return name + " is browsing " + currentPage + " (" + hint + ")";
            }
            return name + " is back (" + hint + ")";
        }
        return "A visitor is back (" + hint + ")";
    }

    /**
     * Builds the engagement hint string for returning visitors using priority ordering.
     *
     * @param totalVisitCount        total visit count
     * @param callsThisWeek          calls in the last 7 days
     * @param requestsThisWeek       visitor-initiated requests in the last 7 days
     * @param declinedPingsThisWeek  declined/expired rep pings in the last 7 days
     * @param hasAnyInteractions     whether any interactions exist ever
     * @return the engagement hint (e.g. "3 calls this week", "5th visit")
     */
    private String buildEngagementHint(long totalVisitCount, long callsThisWeek,
            long requestsThisWeek, long declinedPingsThisWeek, boolean hasAnyInteractions) {
        if (callsThisWeek > 0) {
            return callsThisWeek + (callsThisWeek == 1 ? " call this week" : " calls this week");
        }
        if (requestsThisWeek > 0) {
            return requestsThisWeek + (requestsThisWeek == 1 ? " request this week" : " requests this week");
        }
        String ordinalVisit = toOrdinal(totalVisitCount) + " visit";
        if (declinedPingsThisWeek > 0) {
            return ordinalVisit + " \u00b7 declined contact";
        }
        if (!hasAnyInteractions) {
            return ordinalVisit + " \u00b7 never connected";
        }
        return ordinalVisit;
    }

    /**
     * Converts a number to its ordinal string (e.g. 1 → "1st", 2 → "2nd", 11 → "11th").
     *
     * @param n the number
     * @return the ordinal string
     */
    private String toOrdinal(long n) {
        long mod100 = n % 100;
        if (mod100 >= 11 && mod100 <= 13) {
            return n + "th";
        }
        return switch ((int) (n % 10)) {
            case 1 -> n + "st";
            case 2 -> n + "nd";
            case 3 -> n + "rd";
            default -> n + "th";
        };
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
