package com.notificationservice.service;

import com.notificationservice.dto.CreateInvitationRequest;
import com.notificationservice.dto.OrganizationInvitationDto;
import com.notificationservice.entity.*;
import com.notificationservice.repository.OrganizationInvitationRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing organization invitations.
 * Handles creating, accepting, declining, and revoking invitations.
 */
@Service
@RequiredArgsConstructor
public class InvitationService {

    private final OrganizationInvitationRepository invitationRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;

    /**
     * Creates an invitation for a user to join an organization.
     *
     * @param slug the organization's URL slug
     * @param request the invitation request with userId and role
     * @param inviterId the ID of the user creating the invitation
     * @return the created invitation DTO
     * @throws AccessDeniedException if inviter is not OWNER/ADMIN or tries to invite as OWNER
     * @throws IllegalArgumentException if user is already a member or has a pending invite
     */
    @Transactional
    public OrganizationInvitationDto createInvitation(String slug, CreateInvitationRequest request, UUID inviterId) {
        Organization org = findBySlugOrThrow(slug);
        verifyRole(org.getId(), inviterId, OrgRole.OWNER, OrgRole.ADMIN);

        if (request.role() == OrgRole.OWNER) {
            throw new AccessDeniedException("Cannot invite as OWNER");
        }

        User invitee = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean alreadyMember = organizationMemberRepository
                .existsByOrganizationIdAndUserId(org.getId(), invitee.getId());
        if (alreadyMember) {
            throw new IllegalArgumentException("User is already a member of this organization");
        }

        boolean hasPendingInvite = invitationRepository
                .existsByOrganizationIdAndInviteeIdAndStatus(org.getId(), invitee.getId(), InvitationStatus.PENDING);
        if (hasPendingInvite) {
            throw new IllegalArgumentException("User already has a pending invitation");
        }

        User inviter = userRepository.findById(inviterId)
                .orElseThrow(() -> new ResourceNotFoundException("Inviter not found"));

        OrganizationInvitation invitation = invitationRepository.save(
                OrganizationInvitation.builder()
                        .organization(org)
                        .inviter(inviter)
                        .invitee(invitee)
                        .role(request.role())
                        .build()
        );

        return toDto(invitation);
    }

    /**
     * Gets pending invitations for an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the ID of the requesting user
     * @return list of pending invitation DTOs
     * @throws AccessDeniedException if user is not a member
     */
    @Transactional(readOnly = true)
    public List<OrganizationInvitationDto> getOrgInvitations(String slug, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyMembership(org.getId(), userId);

        return invitationRepository
                .findByOrganizationIdAndStatus(org.getId(), InvitationStatus.PENDING)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Revokes a pending invitation.
     *
     * @param slug the organization's URL slug
     * @param invitationId the invitation ID
     * @param userId the ID of the requesting user
     * @throws AccessDeniedException if user is not OWNER/ADMIN
     * @throws ResourceNotFoundException if invitation not found
     */
    @Transactional
    public void revokeInvitation(String slug, UUID invitationId, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyRole(org.getId(), userId, OrgRole.OWNER, OrgRole.ADMIN);

        OrganizationInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (!invitation.getOrganization().getId().equals(org.getId())) {
            throw new ResourceNotFoundException("Invitation not found in this organization");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("Can only revoke pending invitations");
        }

        invitation.setStatus(InvitationStatus.REVOKED);
        invitation.setRespondedAt(OffsetDateTime.now());
        invitationRepository.save(invitation);
    }

    /**
     * Gets all pending invitations for a user.
     *
     * @param userId the user's ID
     * @return list of pending invitation DTOs
     */
    @Transactional(readOnly = true)
    public List<OrganizationInvitationDto> getPendingInvitationsForUser(UUID userId) {
        return invitationRepository
                .findByInviteeIdAndStatus(userId, InvitationStatus.PENDING)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Gets the count of pending invitations for a user.
     *
     * @param userId the user's ID
     * @return number of pending invitations
     */
    @Transactional(readOnly = true)
    public long getPendingInvitationCount(UUID userId) {
        return invitationRepository.countByInviteeIdAndStatus(userId, InvitationStatus.PENDING);
    }

    /**
     * Accepts a pending invitation, creating an organization membership.
     *
     * @param invitationId the invitation ID
     * @param userId the ID of the accepting user
     * @return the accepted invitation DTO
     * @throws ResourceNotFoundException if invitation not found
     * @throws AccessDeniedException if user is not the invitee
     * @throws IllegalArgumentException if invitation is not pending
     */
    @Transactional
    public OrganizationInvitationDto acceptInvitation(UUID invitationId, UUID userId) {
        OrganizationInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (!invitation.getInvitee().getId().equals(userId)) {
            throw new AccessDeniedException("You are not the invitee of this invitation");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("Invitation is no longer pending");
        }

        // Create the organization membership
        organizationMemberRepository.save(
                OrganizationMember.builder()
                        .organization(invitation.getOrganization())
                        .user(invitation.getInvitee())
                        .role(invitation.getRole())
                        .build()
        );

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setRespondedAt(OffsetDateTime.now());
        invitationRepository.save(invitation);

        return toDto(invitation);
    }

    /**
     * Declines a pending invitation.
     *
     * @param invitationId the invitation ID
     * @param userId the ID of the declining user
     * @return the declined invitation DTO
     * @throws ResourceNotFoundException if invitation not found
     * @throws AccessDeniedException if user is not the invitee
     * @throws IllegalArgumentException if invitation is not pending
     */
    @Transactional
    public OrganizationInvitationDto declineInvitation(UUID invitationId, UUID userId) {
        OrganizationInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (!invitation.getInvitee().getId().equals(userId)) {
            throw new AccessDeniedException("You are not the invitee of this invitation");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("Invitation is no longer pending");
        }

        invitation.setStatus(InvitationStatus.DECLINED);
        invitation.setRespondedAt(OffsetDateTime.now());
        invitationRepository.save(invitation);

        return toDto(invitation);
    }

    /**
     * Finds an organization by slug or throws an exception.
     *
     * @param slug the organization's URL slug
     * @return the organization
     * @throws ResourceNotFoundException if not found
     */
    private Organization findBySlugOrThrow(String slug) {
        return organizationRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));
    }

    /**
     * Verifies that a user is a member of an organization.
     *
     * @param orgId the organization ID
     * @param userId the user ID
     * @throws AccessDeniedException if user is not a member
     */
    private void verifyMembership(UUID orgId, UUID userId) {
        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(orgId, userId);
        if (!isMember) {
            throw new AccessDeniedException("You are not a member of this organization");
        }
    }

    /**
     * Verifies that a user has one of the allowed roles.
     *
     * @param orgId the organization ID
     * @param userId the user ID
     * @param allowedRoles the roles that are allowed
     * @throws AccessDeniedException if user doesn't have an allowed role
     */
    private void verifyRole(UUID orgId, UUID userId, OrgRole... allowedRoles) {
        OrganizationMember member = organizationMemberRepository
                .findByOrganizationIdAndUserId(orgId, userId)
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this organization"));

        boolean hasRole = Arrays.asList(allowedRoles).contains(member.getRole());
        if (!hasRole) {
            throw new AccessDeniedException("You don't have permission to perform this action");
        }
    }

    /**
     * Converts an invitation entity to a DTO.
     *
     * @param invitation the invitation entity
     * @return the invitation DTO
     */
    private OrganizationInvitationDto toDto(OrganizationInvitation invitation) {
        Organization org = invitation.getOrganization();
        User inviter = invitation.getInviter();
        User invitee = invitation.getInvitee();

        return new OrganizationInvitationDto(
                invitation.getId(),
                org.getId(),
                org.getName(),
                org.getSlug(),
                inviter.getId(),
                inviter.getUsername(),
                invitee.getId(),
                invitee.getUsername(),
                invitee.getFirstName(),
                invitee.getLastName(),
                invitee.getEmail(),
                invitee.getAvatarUrl(),
                invitation.getRole(),
                invitation.getStatus(),
                invitation.getCreatedAt()
        );
    }
}
