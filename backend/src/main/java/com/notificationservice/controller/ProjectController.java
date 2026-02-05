package com.notificationservice.controller;

import com.notificationservice.dto.*;
import com.notificationservice.service.*;
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
}
