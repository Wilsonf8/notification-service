package com.notificationservice.controller;

import com.notificationservice.dto.AcceptRequestResponse;
import com.notificationservice.dto.AddRepRequest;
import com.notificationservice.dto.LiveConnectRepDto;
import com.notificationservice.dto.LiveConnectRequestDto;
import com.notificationservice.dto.PingVisitorResponse;
import com.notificationservice.dto.UpdateAvailabilityRequest;
import com.notificationservice.dto.VisitorListResponse;
import com.notificationservice.service.LiveConnectRepService;
import com.notificationservice.service.LiveConnectRequestService;
import com.notificationservice.service.LiveConnectVisitorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for LiveConnect rep dashboard.
 * Handles rep management, visitor listing, and request handling.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/liveconnect")
@RequiredArgsConstructor
public class LiveConnectDashboardController {

    private final LiveConnectRepService repService;
    private final LiveConnectVisitorService visitorService;
    private final LiveConnectRequestService requestService;

    // Rep Management Endpoints

    /**
     * Gets all reps for a project.
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID
     * @return list of reps
     */
    @GetMapping("/reps")
    public ResponseEntity<List<LiveConnectRepDto>> getReps(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(repService.getReps(projectId, userId));
    }

    /**
     * Adds a user as a rep to a project.
     *
     * @param projectId the project ID
     * @param request the add rep request
     * @param userId the authenticated user's ID
     * @return the created rep
     */
    @PostMapping("/reps")
    public ResponseEntity<LiveConnectRepDto> addRep(
            @PathVariable UUID projectId,
            @Valid @RequestBody AddRepRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(repService.addRep(projectId, request, userId));
    }

    /**
     * Removes a rep from a project.
     *
     * @param projectId the project ID
     * @param repUserId the user ID of the rep to remove
     * @param userId the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/reps/{repUserId}")
    public ResponseEntity<Void> removeRep(
            @PathVariable UUID projectId,
            @PathVariable UUID repUserId,
            @AuthenticationPrincipal UUID userId) {
        repService.removeRep(projectId, repUserId, userId);
        return ResponseEntity.noContent().build();
    }

    // Availability Endpoint

    /**
     * Updates the calling user's availability for a project.
     *
     * @param projectId the project ID
     * @param request the update availability request
     * @param userId the authenticated user's ID (must be a rep)
     * @return the updated rep
     */
    @PutMapping("/availability")
    public ResponseEntity<LiveConnectRepDto> updateAvailability(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateAvailabilityRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(repService.updateAvailability(projectId, request, userId));
    }

    // Visitor Endpoints

    /**
     * Gets visitors for the dashboard (browsing + queue).
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return visitor list with browsing and queue sections
     */
    @GetMapping("/visitors")
    public ResponseEntity<VisitorListResponse> getVisitors(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(visitorService.getVisitors(projectId, userId));
    }

    /**
     * Pings a visitor (rep initiates request to connect).
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return ping response with request ID and expiry
     */
    @PostMapping("/visitors/{visitorId}/ping")
    public ResponseEntity<PingVisitorResponse> pingVisitor(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(visitorService.pingVisitor(projectId, visitorId, userId));
    }

    // Request Endpoints

    /**
     * Gets pending requests for a project.
     *
     * @param projectId the project ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return list of pending requests
     */
    @GetMapping("/requests")
    public ResponseEntity<List<LiveConnectRequestDto>> getRequests(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(requestService.getPendingRequests(projectId, userId));
    }

    /**
     * Accepts a request and creates a conversation.
     *
     * @param projectId the project ID
     * @param requestId the request ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return accept response with conversation details
     */
    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<AcceptRequestResponse> acceptRequest(
            @PathVariable UUID projectId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(requestService.acceptRequest(projectId, requestId, userId));
    }

    /**
     * Dismisses a request.
     *
     * @param projectId the project ID
     * @param requestId the request ID
     * @param userId the authenticated user's ID (must be a rep)
     * @return no content on success
     */
    @PostMapping("/requests/{requestId}/dismiss")
    public ResponseEntity<Void> dismissRequest(
            @PathVariable UUID projectId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal UUID userId) {
        requestService.dismissRequest(projectId, requestId, userId);
        return ResponseEntity.noContent().build();
    }
}
