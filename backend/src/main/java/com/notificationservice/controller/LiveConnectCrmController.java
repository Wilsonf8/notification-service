package com.notificationservice.controller;

import com.notificationservice.dto.*;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.PipelineStage;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.service.LiveConnectCrmService;
import com.notificationservice.service.LiveConnectNoteService;
import com.notificationservice.service.LiveConnectRepService;
import com.notificationservice.service.LiveConnectTagService;
import com.notificationservice.service.LiveConnectConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * REST controller for CRM operations.
 * Provides endpoints for managing the visitor pipeline, tags, notes, and timeline.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/liveconnect/crm")
@RequiredArgsConstructor
public class LiveConnectCrmController {

    private final LiveConnectCrmService crmService;
    private final LiveConnectTagService tagService;
    private final LiveConnectNoteService noteService;
    private final LiveConnectRepService repService;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectConversationService conversationService;

    // ---- Visitor Endpoints ----

    /**
     * Gets paginated CRM visitor list.
     *
     * @param projectId the project ID
     * @param page      page number (0-indexed)
     * @param size      page size
     * @param days      time range in days (1, 3, 7, 30)
     * @param search    optional search term
     * @param stages    optional pipeline stages to filter by (comma-separated)
     * @param tagIds    optional tag IDs for AND-logic filtering (comma-separated)
     * @param sort      sort field (lastSeenAt, leadScore, name)
     * @param direction sort direction (asc, desc)
     * @param userId    the authenticated user's ID
     * @return paginated visitor list
     */
    @GetMapping("/visitors")
    public ResponseEntity<CrmVisitorListResponse> getVisitors(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Set<PipelineStage> stages,
            @RequestParam(required = false) Set<UUID> tagIds,
            @RequestParam(defaultValue = "lastSeenAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(crmService.getVisitors(projectId, days, search, stages, tagIds, page, size, sort, direction));
    }

    /**
     * Gets full visitor CRM profile.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param userId    the authenticated user's ID
     * @return full visitor detail
     */
    @GetMapping("/visitors/{visitorId}")
    public ResponseEntity<CrmVisitorDetailDto> getVisitorDetail(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(crmService.getVisitorDetail(visitorId));
    }

    /**
     * Updates a visitor's pipeline stage.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param request   the update stage request
     * @param userId    the authenticated user's ID
     * @return no content on success
     */
    @PutMapping("/visitors/{visitorId}/stage")
    public ResponseEntity<Void> updateStage(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @Valid @RequestBody UpdatePipelineStageRequest request,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        crmService.updatePipelineStage(visitorId, request.stage());
        return ResponseEntity.noContent().build();
    }

    /**
     * Assigns a rep to a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param request   the assign rep request
     * @param userId    the authenticated user's ID
     * @return no content on success
     */
    @PutMapping("/visitors/{visitorId}/assign")
    public ResponseEntity<Void> assignRep(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @Valid @RequestBody AssignRepRequest request,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        crmService.assignRep(visitorId, request.repId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Unassigns the rep from a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param userId    the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/visitors/{visitorId}/assign")
    public ResponseEntity<Void> unassignRep(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        crmService.unassignRep(visitorId);
        return ResponseEntity.noContent().build();
    }

    // ---- Tag Assignment Endpoints ----

    /**
     * Adds a tag to a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param request   the add tag request
     * @param userId    the authenticated user's ID
     * @return no content on success
     */
    @PostMapping("/visitors/{visitorId}/tags")
    public ResponseEntity<Void> addTagToVisitor(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @Valid @RequestBody AddVisitorTagRequest request,
            @AuthenticationPrincipal UUID userId) {
        LiveConnectRep rep = repService.verifyRepAccess(projectId, userId);
        tagService.addTagToVisitor(visitorId, request.tagId(), rep);
        return ResponseEntity.noContent().build();
    }

    /**
     * Removes a tag from a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param tagId     the tag ID to remove
     * @param userId    the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/visitors/{visitorId}/tags/{tagId}")
    public ResponseEntity<Void> removeTagFromVisitor(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @PathVariable UUID tagId,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        tagService.removeTagFromVisitor(visitorId, tagId);
        return ResponseEntity.noContent().build();
    }

    // ---- Notes Endpoints ----

    /**
     * Gets paginated notes for a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param page      page number (0-indexed)
     * @param size      page size
     * @param userId    the authenticated user's ID
     * @return paginated list of notes
     */
    @GetMapping("/visitors/{visitorId}/notes")
    public ResponseEntity<Page<VisitorNoteDto>> getNotes(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(noteService.getNotes(visitorId, page, size));
    }

    /**
     * Adds a note to a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param request   the create note request
     * @param userId    the authenticated user's ID
     * @return the created note
     */
    @PostMapping("/visitors/{visitorId}/notes")
    public ResponseEntity<VisitorNoteDto> addNote(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @Valid @RequestBody CreateNoteRequest request,
            @AuthenticationPrincipal UUID userId) {
        LiveConnectRep rep = repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(noteService.addNote(projectId, visitorId, request, rep));
    }

    /**
     * Deletes a note.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param noteId    the note ID
     * @param userId    the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/visitors/{visitorId}/notes/{noteId}")
    public ResponseEntity<Void> deleteNote(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @PathVariable UUID noteId,
            @AuthenticationPrincipal UUID userId) {
        LiveConnectRep rep = repService.verifyRepAccess(projectId, userId);
        noteService.deleteNote(noteId, rep);
        return ResponseEntity.noContent().build();
    }

    // ---- Timeline Endpoint ----

    /**
     * Gets the unified timeline for a visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param page      page number (0-indexed)
     * @param size      page size
     * @param userId    the authenticated user's ID
     * @return paginated timeline
     */
    @GetMapping("/visitors/{visitorId}/timeline")
    public ResponseEntity<TimelineResponse> getTimeline(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(crmService.getTimeline(visitorId, page, size));
    }

    // ---- Visitor Conversations Endpoint ----

    /**
     * Gets paginated conversations for a specific visitor.
     *
     * @param projectId the project ID
     * @param visitorId the visitor's internal ID
     * @param page      page number (0-indexed)
     * @param size      page size
     * @param userId    the authenticated user's ID
     * @return paginated list of conversations
     */
    @GetMapping("/visitors/{visitorId}/conversations")
    public ResponseEntity<ConversationListResponse> getVisitorConversations(
            @PathVariable UUID projectId,
            @PathVariable UUID visitorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(conversationService.getVisitorConversations(projectId, visitorId, page, size));
    }

    // ---- Tag Definition Endpoints ----

    /**
     * Gets all tag definitions for a project.
     *
     * @param projectId the project ID
     * @param userId    the authenticated user's ID
     * @return list of tags
     */
    @GetMapping("/tags")
    public ResponseEntity<List<TagDto>> getProjectTags(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(tagService.getProjectTags(projectId));
    }

    /**
     * Creates a new tag definition.
     *
     * @param projectId the project ID
     * @param request   the create tag request
     * @param userId    the authenticated user's ID
     * @return the created tag
     */
    @PostMapping("/tags")
    public ResponseEntity<TagDto> createTag(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateTagRequest request,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(tagService.createTag(projectId, request));
    }

    /**
     * Updates a tag definition.
     *
     * @param projectId the project ID
     * @param tagId     the tag ID
     * @param request   the update tag request
     * @param userId    the authenticated user's ID
     * @return the updated tag
     */
    @PutMapping("/tags/{tagId}")
    public ResponseEntity<TagDto> updateTag(
            @PathVariable UUID projectId,
            @PathVariable UUID tagId,
            @Valid @RequestBody UpdateTagRequest request,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        return ResponseEntity.ok(tagService.updateTag(tagId, request));
    }

    /**
     * Deletes a tag definition.
     *
     * @param projectId the project ID
     * @param tagId     the tag ID
     * @param userId    the authenticated user's ID
     * @return no content on success
     */
    @DeleteMapping("/tags/{tagId}")
    public ResponseEntity<Void> deleteTag(
            @PathVariable UUID projectId,
            @PathVariable UUID tagId,
            @AuthenticationPrincipal UUID userId) {
        repService.verifyRepAccess(projectId, userId);
        tagService.deleteTag(tagId);
        return ResponseEntity.noContent().build();
    }
}
