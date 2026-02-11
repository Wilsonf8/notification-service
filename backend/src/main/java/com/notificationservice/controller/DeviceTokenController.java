package com.notificationservice.controller;

import com.notificationservice.dto.RegisterDeviceTokenRequest;
import com.notificationservice.dto.UnregisterDeviceTokenRequest;
import com.notificationservice.service.DeviceTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller for managing device tokens for push notifications.
 */
@RestController
@RequestMapping("/api/device-tokens")
@RequiredArgsConstructor
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;

    /**
     * Registers a device token for push notifications.
     *
     * @param request the registration request with token and bundle ID
     * @param userId the authenticated user's ID
     * @return 200 OK on success
     */
    @PostMapping
    public ResponseEntity<Void> registerToken(
            @Valid @RequestBody RegisterDeviceTokenRequest request,
            @AuthenticationPrincipal UUID userId) {
        deviceTokenService.registerToken(userId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * Unregisters a device token (e.g., on logout).
     *
     * @param request the unregister request with token
     * @param userId the authenticated user's ID
     * @return 200 OK on success
     */
    @DeleteMapping
    public ResponseEntity<Void> unregisterToken(
            @Valid @RequestBody UnregisterDeviceTokenRequest request,
            @AuthenticationPrincipal UUID userId) {
        deviceTokenService.unregisterToken(userId, request.token());
        return ResponseEntity.ok().build();
    }
}
