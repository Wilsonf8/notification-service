package com.notificationservice.controller;

import com.notificationservice.dto.CreateInvitationRequest;
import com.notificationservice.dto.OrganizationInvitationDto;
import com.notificationservice.service.InvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for organization invitations.
 * Handles both org-scoped operations (create, list, revoke)
 * and user-scoped operations (pending, accept, decline).
 */
@RestController
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    // ========== Org-scoped endpoints ==========

    /**
     * Creates an invitation for a user to join an organization.
     *
     * @param slug the organization's URL slug
     * @param request the invitation request with userId and role
     * @param userId the authenticated user's ID
     * @return the created invitation
     */
    @PostMapping("/api/organizations/{slug}/invitations")
    public ResponseEntity<OrganizationInvitationDto> createInvitation(
            @PathVariable String slug,
            @Valid @RequestBody CreateInvitationRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(invitationService.createInvitation(slug, request, userId));
    }

    /**
     * Lists pending invitations for an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return list of pending invitations
     */
    @GetMapping("/api/organizations/{slug}/invitations")
    public ResponseEntity<List<OrganizationInvitationDto>> getOrgInvitations(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(invitationService.getOrgInvitations(slug, userId));
    }

    /**
     * Revokes a pending invitation.
     *
     * @param slug the organization's URL slug
     * @param invitationId the invitation ID
     * @param userId the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/api/organizations/{slug}/invitations/{invitationId}")
    public ResponseEntity<Void> revokeInvitation(
            @PathVariable String slug,
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal UUID userId) {
        invitationService.revokeInvitation(slug, invitationId, userId);
        return ResponseEntity.noContent().build();
    }

    // ========== User-scoped endpoints ==========

    /**
     * Gets all pending invitations for the authenticated user.
     *
     * @param userId the authenticated user's ID
     * @return list of pending invitations
     */
    @GetMapping("/api/invitations/pending")
    public ResponseEntity<List<OrganizationInvitationDto>> getPendingInvitations(
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(invitationService.getPendingInvitationsForUser(userId));
    }

    /**
     * Gets the count of pending invitations for the authenticated user.
     *
     * @param userId the authenticated user's ID
     * @return map with count value
     */
    @GetMapping("/api/invitations/pending/count")
    public ResponseEntity<Map<String, Long>> getPendingInvitationCount(
            @AuthenticationPrincipal UUID userId) {
        long count = invitationService.getPendingInvitationCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * Accepts a pending invitation.
     *
     * @param invitationId the invitation ID
     * @param userId the authenticated user's ID
     * @return the accepted invitation
     */
    @PostMapping("/api/invitations/{invitationId}/accept")
    public ResponseEntity<OrganizationInvitationDto> acceptInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(invitationService.acceptInvitation(invitationId, userId));
    }

    /**
     * Declines a pending invitation.
     *
     * @param invitationId the invitation ID
     * @param userId the authenticated user's ID
     * @return the declined invitation
     */
    @PostMapping("/api/invitations/{invitationId}/decline")
    public ResponseEntity<OrganizationInvitationDto> declineInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(invitationService.declineInvitation(invitationId, userId));
    }
}
