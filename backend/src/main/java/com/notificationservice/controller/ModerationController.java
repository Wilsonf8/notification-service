package com.notificationservice.controller;

import com.notificationservice.entity.VisitorBlock;
import com.notificationservice.entity.VisitorReport;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.repository.VisitorBlockRepository;
import com.notificationservice.repository.VisitorReportRepository;
import com.notificationservice.service.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * REST controller for UGC moderation features.
 * Provides report and block functionality for visitors (App Store compliance).
 */
@Slf4j
@RestController
@RequestMapping("/api/projects/{projectId}/liveconnect/visitors/{visitorId}")
@RequiredArgsConstructor
public class ModerationController {

    private final ProjectRepository projectRepository;
    private final LiveConnectVisitorRepository visitorRepository;
    private final VisitorReportRepository reportRepository;
    private final VisitorBlockRepository blockRepository;

    /**
     * Report a visitor or their message content.
     *
     * @param projectId the project ID
     * @param visitorId the visitor ID
     * @param userId the authenticated user's ID
     * @param request the report details
     * @return 201 Created on success
     */
    @PostMapping("/report")
    public ResponseEntity<Map<String, String>> reportVisitor(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @AuthenticationPrincipal UUID userId,
            @RequestBody ReportRequest request) {

        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        var visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));

        var report = VisitorReport.builder()
                .project(project)
                .visitor(visitor)
                .reporterUserId(userId)
                .reason(request.reason())
                .messageContent(request.messageContent())
                .build();

        reportRepository.save(report);
        log.info("Visitor {} reported by user {} in project {}", visitorId, userId, projectId);

        return ResponseEntity.status(201).body(Map.of("status", "reported"));
    }

    /**
     * Block a visitor from the project.
     *
     * @param projectId the project ID
     * @param visitorId the visitor ID
     * @param userId the authenticated user's ID
     * @param request the block details
     * @return 201 Created on success, 200 if already blocked
     */
    @PostMapping("/block")
    public ResponseEntity<Map<String, String>> blockVisitor(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @AuthenticationPrincipal UUID userId,
            @RequestBody(required = false) BlockRequest request) {

        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        var visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));

        // Check if already blocked
        if (blockRepository.existsByProjectIdAndVisitorId(projectId, visitorId)) {
            return ResponseEntity.ok(Map.of("status", "already_blocked"));
        }

        var block = VisitorBlock.builder()
                .project(project)
                .visitor(visitor)
                .blockedByUserId(userId)
                .reason(request != null ? request.reason() : null)
                .build();

        blockRepository.save(block);
        log.info("Visitor {} blocked by user {} in project {}", visitorId, userId, projectId);

        return ResponseEntity.status(201).body(Map.of("status", "blocked"));
    }

    /**
     * Unblock a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor ID
     * @return 200 OK
     */
    @DeleteMapping("/block")
    public ResponseEntity<Void> unblockVisitor(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId) {

        blockRepository.findByProjectIdAndVisitorId(projectId, visitorId)
                .ifPresent(blockRepository::delete);

        log.info("Visitor {} unblocked in project {}", visitorId, projectId);
        return ResponseEntity.ok().build();
    }

    /**
     * Request body for reporting a visitor.
     *
     * @param reason the reason for the report
     * @param messageContent the offensive message content (optional)
     */
    record ReportRequest(String reason, String messageContent) {}

    /**
     * Request body for blocking a visitor.
     *
     * @param reason the reason for blocking (optional)
     */
    record BlockRequest(String reason) {}
}
