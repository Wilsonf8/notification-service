package com.notificationservice.controller;

import com.notificationservice.dto.NotificationPreferencesDto;
import com.notificationservice.dto.UpdateNotificationPreferencesRequest;
import com.notificationservice.service.NotificationPreferencesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller for managing notification preferences.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/liveconnect/notification-preferences")
@RequiredArgsConstructor
public class NotificationPreferencesController {

    private final NotificationPreferencesService preferencesService;

    /**
     * Gets notification preferences for the current rep.
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID
     * @return the notification preferences
     */
    @GetMapping
    public ResponseEntity<NotificationPreferencesDto> getPreferences(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(preferencesService.getPreferences(projectId, userId));
    }

    /**
     * Updates notification preferences for the current rep.
     *
     * @param projectId the project ID
     * @param request the update request
     * @param userId the authenticated user's ID
     * @return the updated preferences
     */
    @PutMapping
    public ResponseEntity<NotificationPreferencesDto> updatePreferences(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateNotificationPreferencesRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(preferencesService.updatePreferences(projectId, userId, request));
    }
}
