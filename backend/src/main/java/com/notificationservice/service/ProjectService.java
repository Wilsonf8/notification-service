package com.notificationservice.service;

import com.notificationservice.dto.*;
import com.notificationservice.entity.OrgRole;
import com.notificationservice.entity.Organization;
import com.notificationservice.entity.OrganizationMember;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.OrganizationRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    @Transactional(readOnly = true)
    public List<ProjectDto> getProjectsForUser(UUID userId) {
        // Get user's personal organization
        Organization personalOrg = organizationRepository.findPersonalOrgByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Personal organization not found"));

        return projectRepository.findByOrganizationIdAndNotDeleted(personalOrg.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectDto> getProjectsForOrganization(UUID orgId, UUID userId) {
        verifyOrgMembership(orgId, userId);
        return projectRepository.findByOrganizationIdAndNotDeleted(orgId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDto getProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        verifyOrgMembership(project.getOrganization().getId(), userId);
        return toDto(project);
    }

    @Transactional
    public ProjectDto createProject(CreateProjectRequest request, UUID orgId, UUID userId) {
        Organization org = verifyOrgMembership(orgId, userId);

        Project project = Project.builder()
                .organization(org)
                .name(request.name())
                .description(request.description())
                .type(ProjectType.LIVECONNECT)
                .build();

        return toDto(projectRepository.save(project));
    }

    @Transactional
    public ProjectDto createProject(CreateProjectRequest request, UUID userId) {
        // Create project under user's personal organization
        Organization personalOrg = organizationRepository.findPersonalOrgByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Personal organization not found"));

        Project project = Project.builder()
                .organization(personalOrg)
                .name(request.name())
                .description(request.description())
                .type(ProjectType.LIVECONNECT)
                .build();

        return toDto(projectRepository.save(project));
    }

    @Transactional
    public ProjectDto updateProject(UUID projectId, CreateProjectRequest request, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        verifyOrgMembership(project.getOrganization().getId(), userId);

        project.setName(request.name());
        project.setDescription(request.description());

        return toDto(projectRepository.save(project));
    }

    /**
     * Deletes a project (soft delete). Only organization OWNER can delete projects.
     *
     * @param projectId the project ID
     * @param userId the requesting user's ID
     * @throws ResourceNotFoundException if project not found
     * @throws AccessDeniedException if user is not the organization OWNER
     */
    @Transactional
    public void deleteProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        verifyOwnerRole(project.getOrganization().getId(), userId);

        project.setDeletedAt(OffsetDateTime.now());
        projectRepository.save(project);
    }

    private Organization verifyOrgMembership(UUID orgId, UUID userId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(orgId, userId);
        if (!isMember) {
            throw new AccessDeniedException("You are not a member of this organization");
        }
        return org;
    }

    private void verifyOwnerRole(UUID orgId, UUID userId) {
        OrganizationMember member = organizationMemberRepository
                .findByOrganizationIdAndUserId(orgId, userId)
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this organization"));

        if (member.getRole() != OrgRole.OWNER) {
            throw new AccessDeniedException("Only the organization owner can delete projects");
        }
    }

    private ProjectDto toDto(Project project) {
        return new ProjectDto(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getType(),
                project.getCreatedAt()
        );
    }
}
