package com.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating a note on a visitor.
 *
 * @param content the note text (1-5000 characters)
 */
public record CreateNoteRequest(
        @NotBlank @Size(max = 5000) String content
) {}
