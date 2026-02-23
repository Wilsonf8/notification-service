package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating a new tag.
 *
 * @param name the tag name (1-50 characters)
 * @param color hex color code (e.g., "#FF5733")
 */
public record CreateTagRequest(
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Size(max = 7) String color
) {}
