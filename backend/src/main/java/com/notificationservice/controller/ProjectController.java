package com.notificationservice.controller;

import com.notificationservice.dto.*;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.User;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.repository.UserRepository;
import com.notificationservice.service.*;
import com.notificationservice.telegram.TelegramService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ApiKeyService apiKeyService;
    private final EventService eventService;
    private final TelegramService telegramService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ProjectDto>> getProjects(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.getProjectsForUser(userId));
    }

    @PostMapping
    public ResponseEntity<ProjectDto> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.createProject(request, userId));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectDto> getProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.getProject(projectId, userId));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectDto> updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(projectService.updateProject(projectId, request, userId));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        projectService.deleteProject(projectId, userId);
        return ResponseEntity.noContent().build();
    }

    // API Keys
    @GetMapping("/{projectId}/api-keys")
    public ResponseEntity<List<ApiKeyDto>> getApiKeys(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(apiKeyService.getApiKeysForProject(projectId, userId));
    }

    @PostMapping("/{projectId}/api-keys")
    public ResponseEntity<ApiKeyCreatedDto> createApiKey(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateApiKeyRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(apiKeyService.createApiKey(projectId, request, userId));
    }

    @DeleteMapping("/{projectId}/api-keys/{keyId}")
    public ResponseEntity<Void> revokeApiKey(
            @PathVariable UUID projectId,
            @PathVariable UUID keyId,
            @AuthenticationPrincipal UUID userId) {
        apiKeyService.revokeApiKey(keyId, userId);
        return ResponseEntity.noContent().build();
    }

    // Telegram
    @PostMapping("/{projectId}/telegram/connect")
    public ResponseEntity<ConnectTokenDto> generateConnectToken(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        Project project = projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String token = telegramService.generateConnectToken(projectId, userId, project, user);
        String deepLink = telegramService.getDeepLink(token);

        return ResponseEntity.ok(new ConnectTokenDto(token, deepLink));
    }

    @DeleteMapping("/{projectId}/telegram")
    public ResponseEntity<Void> disconnectTelegram(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        projectRepository.findByIdAndUserIdAndNotDeleted(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        telegramService.disconnectTelegram(projectId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/telegram/test")
    public ResponseEntity<Void> sendTestNotification(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        // Implementation: create a test event
        return ResponseEntity.ok().build();
    }

    // Events & Stats
    @GetMapping("/{projectId}/events")
    public ResponseEntity<EventsPageDto> getEvents(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(eventService.getEventsForProject(projectId, userId, page, size));
    }

    @GetMapping("/{projectId}/stats")
    public ResponseEntity<ProjectStatsDto> getStats(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(eventService.getStatsForProject(projectId, userId));
    }
}
