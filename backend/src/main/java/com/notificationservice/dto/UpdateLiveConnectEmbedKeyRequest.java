package com.notificationservice.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for updating a LiveConnect embed key.
 *
 * @param name the embed key name
 * @param allowedDomains list of domains allowed to use this key
 */
public record UpdateLiveConnectEmbedKeyRequest(
        @Size(max = 100) String name,
        List<@Pattern(regexp = "^[a-zA-Z0-9][a-zA-Z0-9\\-\\.]*\\.[a-zA-Z]{2,}$",
                message = "Invalid domain format") String> allowedDomains
) {}
