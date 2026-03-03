package com.notificationservice.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request DTO for transferring organization ownership to another member.
 *
 * @param memberId the ID of the organization membership to transfer ownership to
 */
public record TransferOwnershipRequest(
        @NotNull(message = "Member ID is required")
        UUID memberId
) {}
