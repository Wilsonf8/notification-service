package com.notificationservice.dto;

import com.notificationservice.entity.ProjectType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating a new project.
 *
 * @param name the project name (required)
 * @param description optional project description
 * @param type the project type (defaults to NOTIFYKIT if not specified)
 */
public record CreateProjectRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 1000) String description,
        ProjectType type
) {}
