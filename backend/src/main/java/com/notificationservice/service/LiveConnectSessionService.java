package com.notificationservice.service;

import com.notificationservice.dto.PendingRequestInfo;
import com.notificationservice.dto.WidgetInitRequest;
import com.notificationservice.dto.WidgetInitResponse;
import com.notificationservice.entity.LiveConnectEmbedKey;
import com.notificationservice.entity.LiveConnectRequest;
import com.notificationservice.entity.LiveConnectSession;
import com.notificationservice.entity.LiveConnectSettings;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.RequestDirection;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.LiveConnectRequestRepository;
import com.notificationservice.repository.LiveConnectSessionRepository;
import com.notificationservice.repository.LiveConnectSettingsRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.service.GeoIpService.GeoLocation;
import com.notificationservice.service.UserAgentService.DeviceInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

/**
 * Service for managing LiveConnect widget sessions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveConnectSessionService {

    private static final String SESSION_PREFIX = "sess_";
    private static final int TOKEN_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String REDIS_SESSION_PREFIX = "lc:session:";

    private final LiveConnectSessionRepository sessionRepository;
    private final LiveConnectVisitorRepository visitorRepository;
    private final LiveConnectSettingsRepository settingsRepository;
    private final LiveConnectRequestRepository requestRepository;
    private final LiveConnectRepRepository repRepository;
    private final StringRedisTemplate redisTemplate;
    private final GeoIpService geoIpService;
    private final UserAgentService userAgentService;

    @Value("${app.liveconnect.session.ttl-hours}")
    private int sessionTtlHours;

    /**
     * Initializes a new session for a widget visitor.
     *
     * @param request the init request containing visitor ID and client info
     * @param embedKey the validated embed key
     * @param clientIp the client's IP address
     * @param userAgent the client's User-Agent header
     * @return the init response with session token and widget settings
     */
    @Transactional
    public WidgetInitResponse initializeSession(WidgetInitRequest request, LiveConnectEmbedKey embedKey,
                                                 String clientIp, String userAgent) {
        var project = embedKey.getProject();

        // Get or create visitor
        LiveConnectVisitor visitor = visitorRepository
                .findByProjectIdAndVisitorId(project.getId(), request.visitorId())
                .orElseGet(() -> {
                    LiveConnectVisitor newVisitor = LiveConnectVisitor.builder()
                            .project(project)
                            .visitorId(request.visitorId())
                            .build();
                    return visitorRepository.save(newVisitor);
                });

        // Update last seen
        visitor.setLastSeenAt(OffsetDateTime.now());

        // Resolve GeoIP — only if IP changed or geo fields are empty
        boolean ipChanged = clientIp != null && !clientIp.equals(visitor.getIpAddress());
        log.info("[LiveConnect] GeoIP check: clientIp={}, storedIp={}, ipChanged={}, countryCodeNull={}",
                clientIp, visitor.getIpAddress(), ipChanged, visitor.getCountryCode() == null);
        if (ipChanged || visitor.getCountryCode() == null) {
            visitor.setIpAddress(clientIp);
            GeoLocation geo = geoIpService.resolve(clientIp);
            if (geo != null) {
                visitor.setCountry(geo.country());
                visitor.setCountryCode(geo.countryCode());
                visitor.setRegion(geo.region());
                visitor.setCity(geo.city());
                visitor.setLatitude(geo.latitude());
                visitor.setLongitude(geo.longitude());
                visitor.setTimezone(geo.timezone());
            }
        }

        // Parse User-Agent — only if browser info is empty
        if (visitor.getBrowserName() == null && userAgent != null) {
            DeviceInfo device = userAgentService.parse(userAgent);
            if (device != null) {
                visitor.setBrowserName(device.browserName());
                visitor.setBrowserVersion(device.browserVersion());
                visitor.setOsName(device.osName());
                visitor.setOsVersion(device.osVersion());
                visitor.setDeviceType(device.deviceType());
            }
        }

        // Set client-provided fields
        if (request.screenWidth() != null) {
            visitor.setScreenWidth(request.screenWidth().shortValue());
        }
        if (request.screenHeight() != null) {
            visitor.setScreenHeight(request.screenHeight().shortValue());
        }
        if (request.language() != null) {
            visitor.setLanguage(request.language());
        }
        if (request.timezone() != null && visitor.getTimezone() == null) {
            visitor.setTimezone(request.timezone());
        }

        visitorRepository.save(visitor);

        // Generate session token
        String sessionToken = generateSessionToken();
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(sessionTtlHours);

        // Create session in DB
        LiveConnectSession session = LiveConnectSession.builder()
                .sessionToken(sessionToken)
                .project(project)
                .visitor(visitor)
                .embedKey(embedKey)
                .lastActivityAt(OffsetDateTime.now())
                .expiresAt(expiresAt)
                .build();
        sessionRepository.save(session);

        // Cache session in Redis for fast lookup
        cacheSession(session);

        // Get or create widget settings
        LiveConnectSettings settings = settingsRepository.findByProjectId(project.getId())
                .orElseGet(() -> {
                    LiveConnectSettings defaultSettings = LiveConnectSettings.builder()
                            .project(project)
                            .build();
                    return settingsRepository.save(defaultSettings);
                });

        // Check for pending request to restore WAITING state across page navigation
        var pendingRequestOpt = requestRepository.findPendingByVisitorId(visitor.getId());
        log.info("[LiveConnect] Checking pending request for visitor {} (internal ID: {}): found={}",
                request.visitorId(), visitor.getId(), pendingRequestOpt.isPresent());

        if (pendingRequestOpt.isPresent()) {
            var req = pendingRequestOpt.get();
            log.info("[LiveConnect] Pending request details: id={}, direction={}, expiresAt={}, now={}, notExpired={}, isUserToReps={}",
                    req.getId(), req.getDirection(), req.getExpiresAt(), OffsetDateTime.now(),
                    req.getExpiresAt().isAfter(OffsetDateTime.now()),
                    req.getDirection() == RequestDirection.USER_TO_REPS);
        }

        PendingRequestInfo pendingRequestInfo = pendingRequestOpt
                .filter(r -> r.getExpiresAt().isAfter(OffsetDateTime.now()))
                .map(r -> {
                    String repName = null;
                    if (r.getDirection() == RequestDirection.REP_TO_USER && r.getInitiatedByRep() != null) {
                        repName = r.getInitiatedByRep().getUser().getUsername();
                    }
                    return new PendingRequestInfo(r.getId(), r.getExpiresAt(), r.getDirection().name(), repName);
                })
                .orElse(null);

        log.info("[LiveConnect] Final pendingRequestInfo for response: {}", pendingRequestInfo);

        // Check if any reps are available for calls
        boolean repsAvailable = repRepository.hasAnyAvailableReps(project.getId());

        return new WidgetInitResponse(
                sessionToken,
                settings.getWelcomeMessage(),
                settings.getWidgetColor(),
                settings.getWidgetPosition(),
                pendingRequestInfo,
                repsAvailable,
                settings.getBackgroundColor(),
                settings.getTextColor(),
                settings.getBorderRadius(),
                settings.getFontFamily(),
                settings.getWidgetIcon()
        );
    }

    /**
     * Validates a session token and returns the session if valid.
     *
     * @param sessionToken the session token to validate
     * @return the valid session
     * @throws ResourceNotFoundException if session is invalid or expired
     */
    @Transactional(readOnly = true)
    public LiveConnectSession validateSession(String sessionToken) {
        // Check Redis cache first - if key exists, session is valid (TTL handles expiry)
        String cachedExpiresAt = redisTemplate.opsForValue().get(REDIS_SESSION_PREFIX + sessionToken);
        if (cachedExpiresAt != null) {
            OffsetDateTime expiresAt = OffsetDateTime.parse(cachedExpiresAt);
            if (expiresAt.isAfter(OffsetDateTime.now())) {
                // Return from DB to get full entity with relationships
                return sessionRepository.findBySessionToken(sessionToken)
                        .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
            }
        }

        // Fall back to DB query
        return sessionRepository.findBySessionTokenAndNotExpired(sessionToken, OffsetDateTime.now())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found or expired"));
    }

    private String generateSessionToken() {
        byte[] bytes = new byte[TOKEN_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return SESSION_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void cacheSession(LiveConnectSession session) {
        // Cache expiration timestamp as ISO string - Redis TTL will handle cleanup
        redisTemplate.opsForValue().set(
                REDIS_SESSION_PREFIX + session.getSessionToken(),
                session.getExpiresAt().toString(),
                sessionTtlHours,
                TimeUnit.HOURS
        );
    }
}