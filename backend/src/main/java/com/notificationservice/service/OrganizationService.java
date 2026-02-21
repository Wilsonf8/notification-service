package com.notificationservice.service;

import com.notificationservice.dto.*;
import com.notificationservice.entity.OrgRole;
import com.notificationservice.entity.Organization;
import com.notificationservice.entity.OrganizationMember;
import com.notificationservice.entity.User;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Service for managing organizations and their members.
 * Handles organization CRUD operations and member management with role-based access control.
 */
@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final TierService tierService;

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    /**
     * Gets all organizations the user is a member of.
     *
     * @param userId the ID of the user
     * @return list of organizations with user's role
     */
    @Transactional(readOnly = true)
    public List<OrganizationDto> getUserOrganizations(UUID userId) {
        List<Organization> orgs = organizationRepository.findAllByMemberUserId(userId);
        return orgs.stream()
                .map(org -> toDto(org, userId))
                .toList();
    }

    /**
     * Gets a specific organization by slug.
     *
     * @param slug the organization's URL slug
     * @param userId the ID of the requesting user
     * @return the organization DTO
     * @throws ResourceNotFoundException if organization not found
     * @throws AccessDeniedException if user is not a member
     */
    @Transactional(readOnly = true)
    public OrganizationDto getOrganization(String slug, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyMembership(org.getId(), userId);
        return toDto(org, userId);
    }

    /**
     * Creates a new team organization.
     *
     * @param request the creation request with organization name
     * @param userId the ID of the creating user who becomes OWNER
     * @return the created organization DTO
     */
    @Transactional
    public OrganizationDto createOrganization(CreateOrganizationRequest request, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String slug = generateUniqueSlug(request.name());

        Organization org = Organization.builder()
                .name(request.name())
                .slug(slug)
                .owner(user)
                .isPersonal(false)
                .build();

        org = organizationRepository.save(org);

        OrganizationMember ownerMember = OrganizationMember.builder()
                .organization(org)
                .user(user)
                .role(OrgRole.OWNER)
                .build();

        organizationMemberRepository.save(ownerMember);

        return toDto(org, userId);
    }

    /**
     * Updates an organization's details.
     *
     * @param slug the organization's URL slug
     * @param request the update request
     * @param userId the ID of the requesting user
     * @return the updated organization DTO
     * @throws AccessDeniedException if user is not OWNER or ADMIN
     */
    @Transactional
    public OrganizationDto updateOrganization(String slug, UpdateOrganizationRequest request, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyRole(org.getId(), userId, OrgRole.OWNER, OrgRole.ADMIN);

        org.setName(request.name());
        org = organizationRepository.save(org);

        return toDto(org, userId);
    }

    /**
     * Deletes an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the ID of the requesting user
     * @throws AccessDeniedException if user is not OWNER or if it's a personal org
     */
    @Transactional
    public void deleteOrganization(String slug, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyRole(org.getId(), userId, OrgRole.OWNER);

        if (Boolean.TRUE.equals(org.getIsPersonal())) {
            throw new AccessDeniedException("Cannot delete personal organization");
        }

        organizationRepository.delete(org);
    }

    /**
     * Gets all members of an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the ID of the requesting user
     * @return list of organization members
     * @throws AccessDeniedException if user is not a member
     */
    @Transactional(readOnly = true)
    public List<OrganizationMemberDto> getMembers(String slug, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyMembership(org.getId(), userId);

        List<OrganizationMember> members = organizationMemberRepository.findByOrganizationId(org.getId());
        return members.stream()
                .map(this::toMemberDto)
                .toList();
    }

    /**
     * Adds a member to an organization by username.
     *
     * @param slug the organization's URL slug
     * @param request the add member request with username and role
     * @param userId the ID of the requesting user
     * @return the new member DTO
     * @throws ResourceNotFoundException if user not found
     * @throws AccessDeniedException if requesting user is not OWNER/ADMIN or tries to add as OWNER
     * @throws IllegalArgumentException if user is already a member
     */
    @Transactional
    public OrganizationMemberDto addMember(String slug, AddMemberRequest request, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        tierService.enforceOrgActive(org);
        tierService.enforceMemberLimit(org);
        verifyRole(org.getId(), userId, OrgRole.OWNER, OrgRole.ADMIN);

        if (request.role() == OrgRole.OWNER) {
            throw new AccessDeniedException("Cannot add member as OWNER");
        }

        User userToAdd = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found. They must create an account first."));

        boolean alreadyMember = organizationMemberRepository
                .existsByOrganizationIdAndUserId(org.getId(), userToAdd.getId());
        if (alreadyMember) {
            throw new IllegalArgumentException("User is already a member of this organization");
        }

        OrganizationMember member = OrganizationMember.builder()
                .organization(org)
                .user(userToAdd)
                .role(request.role())
                .build();

        member = organizationMemberRepository.save(member);
        return toMemberDto(member);
    }

    /**
     * Updates a member's role.
     *
     * @param slug the organization's URL slug
     * @param memberId the ID of the membership to update
     * @param request the role update request
     * @param userId the ID of the requesting user
     * @return the updated member DTO
     * @throws AccessDeniedException if requesting user is not OWNER
     */
    @Transactional
    public OrganizationMemberDto updateMemberRole(String slug, UUID memberId, UpdateMemberRoleRequest request, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyRole(org.getId(), userId, OrgRole.OWNER);

        if (request.role() == OrgRole.OWNER) {
            throw new AccessDeniedException("Cannot change role to OWNER");
        }

        OrganizationMember member = organizationMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        if (!member.getOrganization().getId().equals(org.getId())) {
            throw new ResourceNotFoundException("Member not found in this organization");
        }

        if (member.getRole() == OrgRole.OWNER) {
            throw new AccessDeniedException("Cannot change the role of the organization owner");
        }

        member.setRole(request.role());
        member = organizationMemberRepository.save(member);
        return toMemberDto(member);
    }

    /**
     * Removes a member from an organization.
     *
     * @param slug the organization's URL slug
     * @param memberId the ID of the membership to remove
     * @param userId the ID of the requesting user
     * @throws AccessDeniedException if not authorized or trying to remove OWNER
     */
    @Transactional
    public void removeMember(String slug, UUID memberId, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        OrganizationMember requestingMember = verifyRole(org.getId(), userId, OrgRole.OWNER, OrgRole.ADMIN);

        OrganizationMember memberToRemove = organizationMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        if (!memberToRemove.getOrganization().getId().equals(org.getId())) {
            throw new ResourceNotFoundException("Member not found in this organization");
        }

        if (memberToRemove.getRole() == OrgRole.OWNER) {
            throw new AccessDeniedException("Cannot remove the organization owner");
        }

        // ADMINs can only remove MEMBERs
        if (requestingMember.getRole() == OrgRole.ADMIN && memberToRemove.getRole() == OrgRole.ADMIN) {
            throw new AccessDeniedException("Admins cannot remove other admins");
        }

        organizationMemberRepository.delete(memberToRemove);
    }

    /**
     * Allows a user to leave an organization.
     *
     * @param slug the organization's URL slug
     * @param userId the ID of the user leaving
     * @throws AccessDeniedException if user is OWNER or it's a personal org
     */
    @Transactional
    public void leaveOrganization(String slug, UUID userId) {
        Organization org = findBySlugOrThrow(slug);

        if (Boolean.TRUE.equals(org.getIsPersonal())) {
            throw new AccessDeniedException("Cannot leave personal organization");
        }

        OrganizationMember member = organizationMemberRepository
                .findByOrganizationIdAndUserId(org.getId(), userId)
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this organization"));

        if (member.getRole() == OrgRole.OWNER) {
            throw new AccessDeniedException("Owner cannot leave the organization. Transfer ownership first or delete the organization.");
        }

        organizationMemberRepository.delete(member);
    }

    /**
     * Gets an organization entity for billing operations.
     * Verifies the user has OWNER role.
     *
     * @param slug the organization's URL slug
     * @param userId the requesting user's ID
     * @return the organization entity
     * @throws ResourceNotFoundException if organization not found
     * @throws AccessDeniedException if user is not OWNER
     */
    @Transactional(readOnly = true)
    public Organization getOrganizationForBilling(String slug, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyRole(org.getId(), userId, OrgRole.OWNER);
        return org;
    }

    /**
     * Gets an organization entity for billing status.
     * Verifies the user has OWNER role.
     *
     * @param slug the organization's URL slug
     * @param userId the requesting user's ID
     * @return the organization entity
     * @throws ResourceNotFoundException if organization not found
     * @throws AccessDeniedException if user is not OWNER
     */
    @Transactional(readOnly = true)
    public Organization getOrganizationForBillingStatus(String slug, UUID userId) {
        Organization org = findBySlugOrThrow(slug);
        verifyRole(org.getId(), userId, OrgRole.OWNER);
        return org;
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
     * @return the organization member if authorized
     * @throws AccessDeniedException if user doesn't have an allowed role
     */
    private OrganizationMember verifyRole(UUID orgId, UUID userId, OrgRole... allowedRoles) {
        OrganizationMember member = organizationMemberRepository
                .findByOrganizationIdAndUserId(orgId, userId)
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this organization"));

        boolean hasRole = Arrays.asList(allowedRoles).contains(member.getRole());
        if (!hasRole) {
            throw new AccessDeniedException("You don't have permission to perform this action");
        }

        return member;
    }

    /**
     * Generates a unique slug from an organization name.
     *
     * @param name the organization name
     * @return a unique URL-safe slug
     */
    public String generateUniqueSlug(String name) {
        String baseSlug = toSlug(name);
        String slug = baseSlug;
        int counter = 1;

        while (organizationRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter;
            counter++;
        }

        return slug;
    }

    /**
     * Converts a string to a URL-safe slug.
     *
     * @param input the input string
     * @return the slugified string
     */
    private String toSlug(String input) {
        String nowhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH);
    }

    /**
     * Converts an organization to a DTO with the user's role.
     *
     * @param org the organization entity
     * @param userId the requesting user's ID
     * @return the organization DTO
     */
    private OrganizationDto toDto(Organization org, UUID userId) {
        OrgRole userRole = organizationMemberRepository
                .findByOrganizationIdAndUserId(org.getId(), userId)
                .map(OrganizationMember::getRole)
                .orElse(null);

        return new OrganizationDto(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getIsPersonal(),
                userRole,
                org.getCreatedAt()
        );
    }

    /**
     * Converts an organization member to a DTO.
     *
     * @param member the member entity
     * @return the member DTO
     */
    private OrganizationMemberDto toMemberDto(OrganizationMember member) {
        User user = member.getUser();
        return new OrganizationMemberDto(
                member.getId(),
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getAvatarUrl(),
                member.getRole(),
                member.getCreatedAt()
        );
    }
}
