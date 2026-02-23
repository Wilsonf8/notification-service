package com.notificationservice.service;

import com.notificationservice.dto.CreateTagRequest;
import com.notificationservice.dto.TagDto;
import com.notificationservice.dto.UpdateTagRequest;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.LiveConnectTag;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.LiveConnectVisitorTag;
import com.notificationservice.entity.Project;
import com.notificationservice.repository.LiveConnectTagRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import com.notificationservice.repository.LiveConnectVisitorTagRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing project tags and visitor tag assignments.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveConnectTagService {

    private final LiveConnectTagRepository tagRepository;
    private final LiveConnectVisitorTagRepository visitorTagRepository;
    private final LiveConnectVisitorRepository visitorRepository;
    private final ProjectRepository projectRepository;

    /**
     * Gets all tag definitions for a project.
     *
     * @param projectId the project ID
     * @return list of tags ordered alphabetically
     */
    @Transactional(readOnly = true)
    public List<TagDto> getProjectTags(UUID projectId) {
        return tagRepository.findByProjectIdOrderByNameAsc(projectId).stream()
                .map(t -> new TagDto(t.getId(), t.getName(), t.getColor()))
                .toList();
    }

    /**
     * Creates a new tag definition for a project.
     *
     * @param projectId the project ID
     * @param request   the create tag request
     * @return the created tag
     * @throws IllegalArgumentException if tag name already exists
     */
    @Transactional
    public TagDto createTag(UUID projectId, CreateTagRequest request) {
        if (tagRepository.existsByProjectIdAndName(projectId, request.name())) {
            throw new IllegalArgumentException("Tag name already exists");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        LiveConnectTag tag = LiveConnectTag.builder()
                .project(project)
                .name(request.name())
                .color(request.color())
                .build();

        tag = tagRepository.save(tag);
        return new TagDto(tag.getId(), tag.getName(), tag.getColor());
    }

    /**
     * Updates a tag definition.
     *
     * @param tagId   the tag ID
     * @param request the update tag request
     * @return the updated tag
     * @throws ResourceNotFoundException if tag not found
     */
    @Transactional
    public TagDto updateTag(UUID tagId, UpdateTagRequest request) {
        LiveConnectTag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found"));

        if (request.name() != null && !request.name().isBlank()) {
            tag.setName(request.name());
        }
        if (request.color() != null && !request.color().isBlank()) {
            tag.setColor(request.color());
        }

        tag = tagRepository.save(tag);
        return new TagDto(tag.getId(), tag.getName(), tag.getColor());
    }

    /**
     * Deletes a tag definition and all its assignments.
     *
     * @param tagId the tag ID
     * @throws ResourceNotFoundException if tag not found
     */
    @Transactional
    public void deleteTag(UUID tagId) {
        LiveConnectTag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found"));
        tagRepository.delete(tag);
    }

    /**
     * Adds a tag to a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @param tagId     the tag ID
     * @param rep       the rep performing the action
     * @throws ResourceNotFoundException if visitor or tag not found
     * @throws IllegalArgumentException if tag already assigned
     */
    @Transactional
    public void addTagToVisitor(UUID visitorId, UUID tagId, LiveConnectRep rep) {
        if (visitorTagRepository.existsByVisitorIdAndTagId(visitorId, tagId)) {
            throw new IllegalArgumentException("Tag already assigned to visitor");
        }

        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));
        LiveConnectTag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found"));

        LiveConnectVisitorTag visitorTag = LiveConnectVisitorTag.builder()
                .visitor(visitor)
                .tag(tag)
                .taggedByRep(rep)
                .build();

        visitorTagRepository.save(visitorTag);
    }

    /**
     * Removes a tag from a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @param tagId     the tag ID
     */
    @Transactional
    public void removeTagFromVisitor(UUID visitorId, UUID tagId) {
        visitorTagRepository.deleteByVisitorIdAndTagId(visitorId, tagId);
    }
}
