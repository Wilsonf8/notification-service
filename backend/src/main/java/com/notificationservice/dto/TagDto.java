package com.notificationservice.dto;

import java.util.UUID;

/**
 * DTO for a tag definition.
 *
 * @param id the tag ID
 * @param name the tag name
 * @param color hex color code (e.g., "#FF5733")
 */
public record TagDto(
        UUID id,
        String name,
        String color
) {}
