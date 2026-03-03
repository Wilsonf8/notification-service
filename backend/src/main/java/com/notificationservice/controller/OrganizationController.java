package com.notificationservice.controller;

import com.notificationservice.dto.*;
import com.notificationservice.service.OrganizationService;
import com.notificationservice.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for organization management.
 * Handles organization CRUD, member management, and organization-scoped projects.
 */
@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;
    private final ProjectService projectService;

    /**
     * Lists all organizations the current user is a member of.
     *
     * @param userId the authenticated user's ID
     * @return list of organizations with user's role
     */
    @GetMapping
    public ResponseEntity<List<OrganizationDto>> getOrganizations(
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(organizationService.getUserOrganizations(userId));
    }

    /**
     * Creates a new team organization.
     *
     * @param request the creation request with organization name
     * @param userId the authenticated user's ID who becomes OWNER
     * @return the created organization
     */
    @PostMapping
    public ResponseEntity<OrganizationDto> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(organizationService.createOrganization(request, userId));
    }

    /**
     * Gets a specific organization by slug.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return the organization details
     */
    @GetMapping("/{slug}")
    public ResponseEntity<OrganizationDto> getOrganization(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(organizationService.getOrganization(slug, userId));
    }

    /**
     * Updates an organization's details.
     *
     * @param slug the organization's URL slug
     * @param request the update request
     * @param userId the authenticated user's ID
     * @return the updated organization
     */
    @PutMapping("/{slug}")
    public ResponseEntity<OrganizationDto> updateOrganization(
            @PathVariable String slug,
            @Valid @RequestBody UpdateOrganizationRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(organizationService.updateOrganization(slug, request, userId));
    }

    /**
     * Deletes an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> deleteOrganization(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        organizationService.deleteOrganization(slug, userId);
        return ResponseEntity.noContent().build();
    }

    // Member Management

    /**
     * Lists all members of an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return list of organization members
     */
    @GetMapping("/{slug}/members")
    public ResponseEntity<List<OrganizationMemberDto>> getMembers(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(organizationService.getMembers(slug, userId));
    }

    /**
     * Adds a member to an organization by username.
     *
     * @param slug the organization's URL slug
     * @param request the add member request with username and role
     * @param userId the authenticated user's ID
     * @return the new member
     */
    @PostMapping("/{slug}/members")
    public ResponseEntity<OrganizationMemberDto> addMember(
            @PathVariable String slug,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(organizationService.addMember(slug, request, userId));
    }

    /**
     * Updates a member's role.
     *
     * @param slug the organization's URL slug
     * @param memberId the membership ID
     * @param request the role update request
     * @param userId the authenticated user's ID
     * @return the updated member
     */
    @PutMapping("/{slug}/members/{memberId}/role")
    public ResponseEntity<OrganizationMemberDto> updateMemberRole(
            @PathVariable String slug,
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateMemberRoleRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(organizationService.updateMemberRole(slug, memberId, request, userId));
    }

    /**
     * Transfers ownership of an organization to another member.
     *
     * @param slug the organization's URL slug
     * @param request the transfer request with target member ID
     * @param userId the authenticated user's ID (must be current OWNER)
     * @return 200 OK on success
     */
    @PostMapping("/{slug}/transfer-ownership")
    public ResponseEntity<Void> transferOwnership(
            @PathVariable String slug,
            @Valid @RequestBody TransferOwnershipRequest request,
            @AuthenticationPrincipal UUID userId) {
        organizationService.transferOwnership(slug, request.memberId(), userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Removes a member from an organization.
     *
     * @param slug the organization's URL slug
     * @param memberId the membership ID
     * @param userId the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/{slug}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable String slug,
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UUID userId) {
        organizationService.removeMember(slug, memberId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Allows the current user to leave an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return no content on success
     */
    @PostMapping("/{slug}/leave")
    public ResponseEntity<Void> leaveOrganization(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        organizationService.leaveOrganization(slug, userId);
        return ResponseEntity.noContent().build();
    }

    // Organization Projects

    /**
     * Gets all projects for an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the authenticated user's ID
     * @return list of projects in the organization
     */
    @GetMapping("/{slug}/projects")
    public ResponseEntity<List<ProjectDto>> getOrganizationProjects(
            @PathVariable String slug,
            @AuthenticationPrincipal UUID userId) {
        OrganizationDto org = organizationService.getOrganization(slug, userId);
        return ResponseEntity.ok(projectService.getProjectsForOrganization(org.id(), userId));
    }

    /**
     * Creates a project in an organization.
     *
     * @param slug the organization's URL slug
     * @param request the project creation request
     * @param userId the authenticated user's ID
     * @return the created project
     */
    @PostMapping("/{slug}/projects")
    public ResponseEntity<ProjectDto> createOrganizationProject(
            @PathVariable String slug,
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UUID userId) {
        OrganizationDto org = organizationService.getOrganization(slug, userId);
        return ResponseEntity.ok(projectService.createProject(request, org.id(), userId));
    }
}
