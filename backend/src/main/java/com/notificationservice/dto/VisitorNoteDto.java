package com.notificationservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO for a visitor CRM note.
 *
 * @param id the note ID
 * @param content the note text content
 * @param authorName the name of the rep who wrote the note
 * @param authorRepId the rep ID of the author
 * @param createdAt when the note was created
 */
public record VisitorNoteDto(
        UUID id,
        String content,
        String authorName,
        UUID authorRepId,
        OffsetDateTime createdAt
) {}
