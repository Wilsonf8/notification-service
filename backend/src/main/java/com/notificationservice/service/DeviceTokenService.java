package com.notificationservice.service;

import com.notificationservice.dto.RegisterDeviceTokenRequest;
import com.notificationservice.entity.DeviceToken;
import com.notificationservice.entity.Platform;
import com.notificationservice.entity.User;
import com.notificationservice.repository.DeviceTokenRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing device tokens for push notifications.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceTokenService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    /**
     * Registers or updates a device token for a user.
     * If the token already exists for another user, it will be reassigned.
     *
     * @param userId the user ID
     * @param request the registration request with token and bundle ID
     */
    @Transactional
    public void registerToken(UUID userId, RegisterDeviceTokenRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if token already exists
        var existingToken = deviceTokenRepository.findByDeviceToken(request.token());

        if (existingToken.isPresent()) {
            DeviceToken token = existingToken.get();
            // If token belongs to different user, reassign it
            if (!token.getUser().getId().equals(userId)) {
                log.info("Reassigning device token from user {} to user {}",
                        token.getUser().getId(), userId);
                token.setUser(user);
            }
            // Update token properties
            token.setBundleId(request.bundleId());
            token.setIsValid(true);
            token.setLastUsedAt(OffsetDateTime.now());
            deviceTokenRepository.save(token);
        } else {
            // Create new token
            DeviceToken token = DeviceToken.builder()
                    .user(user)
                    .deviceToken(request.token())
                    .bundleId(request.bundleId())
                    .platform(Platform.IOS)
                    .isValid(true)
                    .lastUsedAt(OffsetDateTime.now())
                    .build();
            deviceTokenRepository.save(token);
            log.info("Registered new device token for user {}", userId);
        }
    }

    /**
     * Unregisters a device token for a user.
     *
     * @param userId the user ID
     * @param token the device token string
     */
    @Transactional
    public void unregisterToken(UUID userId, String token) {
        deviceTokenRepository.deleteByDeviceTokenAndUserId(token, userId);
        log.info("Unregistered device token for user {}", userId);
    }

    /**
     * Gets all valid device tokens for a user.
     *
     * @param userId the user ID
     * @return list of valid device tokens
     */
    @Transactional(readOnly = true)
    public List<DeviceToken> getValidTokensForUser(UUID userId) {
        return deviceTokenRepository.findValidByUserId(userId);
    }

    /**
     * Marks a device token as invalid (e.g., after APNs rejection).
     *
     * @param token the device token string
     */
    @Transactional
    public void invalidateToken(String token) {
        deviceTokenRepository.invalidateToken(token);
        log.info("Invalidated device token: {}...", token.substring(0, Math.min(8, token.length())));
    }
}
