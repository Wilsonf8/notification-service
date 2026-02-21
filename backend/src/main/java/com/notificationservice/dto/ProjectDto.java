package com.notificationservice.dto;

import com.notificationservice.entity.ProjectType;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for project data.
 *
 * @param id the project ID
 * @param name the project name
 * @param description optional project description
 * @param type the project type
 * @param organizationSlug the slug of the owning organization
 * @param createdAt when the project was created
 */
public record ProjectDto(
        UUID id,
        String name,
        String description,
        ProjectType type,
        String organizationSlug,
        OffsetDateTime createdAt
) {}
