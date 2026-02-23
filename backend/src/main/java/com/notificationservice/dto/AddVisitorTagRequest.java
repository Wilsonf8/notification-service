package com.notificationservice.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Request DTO for adding a tag to a visitor.
 *
 * @param tagId the tag ID to assign
 */
public record AddVisitorTagRequest(
        @NotNull UUID tagId
) {}
