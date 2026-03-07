package com.notificationservice.service;

import com.notificationservice.dto.CreateNoteRequest;
import com.notificationservice.dto.VisitorNoteDto;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.LiveConnectVisitorNote;
import com.notificationservice.entity.Project;
import com.notificationservice.repository.LiveConnectVisitorNoteRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for managing visitor CRM notes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveConnectNoteService {

    private final LiveConnectVisitorNoteRepository noteRepository;
    private final LiveConnectVisitorRepository visitorRepository;
    private final ProjectRepository projectRepository;

    /**
     * Gets paginated notes for a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @param page      page number (0-indexed)
     * @param size      page size
     * @return paginated list of notes
     */
    @Transactional(readOnly = true)
    public Page<VisitorNoteDto> getNotes(UUID visitorId, int page, int size) {
        return noteRepository.findByVisitorIdOrderByCreatedAtDesc(visitorId, PageRequest.of(page, size))
                .map(n -> new VisitorNoteDto(
                        n.getId(),
                        n.getContent(),
                        n.getAuthorRep().getUser().getDisplayName(),
                        n.getAuthorRep().getId(),
                        n.getCreatedAt()
                ));
    }

    /**
     * Adds a note to a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param request   the create note request
     * @param rep       the rep creating the note
     * @return the created note
     * @throws ResourceNotFoundException if visitor or project not found
     */
    @Transactional
    public VisitorNoteDto addNote(UUID projectId, UUID visitorId, CreateNoteRequest request, LiveConnectRep rep) {
        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        LiveConnectVisitorNote note = LiveConnectVisitorNote.builder()
                .visitor(visitor)
                .project(project)
                .authorRep(rep)
                .content(request.content())
                .build();

        note = noteRepository.save(note);
        return new VisitorNoteDto(
                note.getId(),
                note.getContent(),
                rep.getUser().getDisplayName(),
                rep.getId(),
                note.getCreatedAt()
        );
    }

    /**
     * Deletes a note (author only).
     *
     * @param noteId the note ID
     * @param rep    the requesting rep
     * @throws ResourceNotFoundException if note not found
     * @throws AccessDeniedException if the rep is not the author
     */
    @Transactional
    public void deleteNote(UUID noteId, LiveConnectRep rep) {
        LiveConnectVisitorNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));

        if (!note.getAuthorRep().getId().equals(rep.getId())) {
            throw new AccessDeniedException("Only the author can delete this note");
        }

        noteRepository.delete(note);
    }
}
