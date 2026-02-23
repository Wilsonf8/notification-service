package com.notificationservice.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Request DTO for assigning a rep to a visitor.
 *
 * @param repId the rep's ID to assign
 */
public record AssignRepRequest(
        @NotNull UUID repId
) {}
