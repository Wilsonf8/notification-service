package com.notificationservice.controller;

import com.notificationservice.dto.*;
import com.notificationservice.service.LiveConnectEmbedKeyService;
import com.notificationservice.service.LiveConnectSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for LiveConnect project configuration.
 * Handles settings and embed key management for LIVECONNECT type projects.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/liveconnect")
@RequiredArgsConstructor
public class LiveConnectController {

    private final LiveConnectSettingsService settingsService;
    private final LiveConnectEmbedKeyService embedKeyService;

    // Settings Endpoints

    /**
     * Gets LiveConnect settings for a project.
     * Creates default settings if none exist.
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID
     * @return the settings
     */
    @GetMapping("/settings")
    public ResponseEntity<LiveConnectSettingsDto> getSettings(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(settingsService.getSettings(projectId, userId));
    }

    /**
     * Updates LiveConnect settings for a project.
     *
     * @param projectId the project ID
     * @param request the update request
     * @param userId the authenticated user's ID
     * @return the updated settings
     */
    @PutMapping("/settings")
    public ResponseEntity<LiveConnectSettingsDto> updateSettings(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateLiveConnectSettingsRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(settingsService.updateSettings(projectId, request, userId));
    }

    // Embed Keys Endpoints

    /**
     * Gets all embed keys for a project.
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID
     * @return list of embed keys (key prefix only, not full key)
     */
    @GetMapping("/embed-keys")
    public ResponseEntity<List<LiveConnectEmbedKeyDto>> getEmbedKeys(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(embedKeyService.getEmbedKeys(projectId, userId));
    }

    /**
     * Creates a new embed key for a project.
     *
     * @param projectId the project ID
     * @param request the creation request
     * @param userId the authenticated user's ID
     * @return the created embed key (includes full key, shown only once)
     */
    @PostMapping("/embed-keys")
    public ResponseEntity<LiveConnectEmbedKeyCreatedDto> createEmbedKey(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateLiveConnectEmbedKeyRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(embedKeyService.createEmbedKey(projectId, request, userId));
    }

    /**
     * Updates an embed key's name and allowed domains.
     *
     * @param projectId the project ID (used for authorization)
     * @param keyId the embed key ID
     * @param request the update request
     * @param userId the authenticated user's ID
     * @return the updated embed key
     */
    @PutMapping("/embed-keys/{keyId}")
    public ResponseEntity<LiveConnectEmbedKeyDto> updateEmbedKey(
            @PathVariable UUID projectId,
            @PathVariable UUID keyId,
            @Valid @RequestBody UpdateLiveConnectEmbedKeyRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(embedKeyService.updateEmbedKey(keyId, request, userId));
    }

    /**
     * Revokes (soft deletes) an embed key.
     *
     * @param projectId the project ID (used for authorization)
     * @param keyId the embed key ID
     * @param userId the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/embed-keys/{keyId}")
    public ResponseEntity<Void> deleteEmbedKey(
            @PathVariable UUID projectId,
            @PathVariable UUID keyId,
            @AuthenticationPrincipal UUID userId) {
        embedKeyService.deleteEmbedKey(keyId, userId);
        return ResponseEntity.noContent().build();
    }
}
