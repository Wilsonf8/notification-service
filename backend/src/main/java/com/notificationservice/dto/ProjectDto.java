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
 * @param type the project type (NOTIFYKIT or LIVECONNECT)
 * @param telegramDestination telegram destination configuration (for NOTIFYKIT projects)
 * @param createdAt when the project was created
 */
public record ProjectDto(
        UUID id,
        String name,
        String description,
        ProjectType type,
        TelegramDestinationDto telegramDestination,
        OffsetDateTime createdAt
) {}
