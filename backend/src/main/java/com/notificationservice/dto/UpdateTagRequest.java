package com.notificationservice.dto;

import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating a tag.
 *
 * @param name the new tag name (optional, 1-50 characters)
 * @param color the new hex color code (optional)
 */
public record UpdateTagRequest(
        @Size(max = 50) String name,
        @Size(max = 7) String color
) {}
