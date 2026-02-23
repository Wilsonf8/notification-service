package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for updating a visitor's pipeline stage.
 *
 * @param stage the new pipeline stage (NEW, ENGAGED, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST)
 */
public record UpdatePipelineStageRequest(
        @NotBlank String stage
) {}
