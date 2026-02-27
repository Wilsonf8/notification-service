package com.notificationservice.service;

import com.notificationservice.dto.*;
import com.notificationservice.entity.*;
import com.notificationservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for CRM visitor management operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveConnectCrmService {

    private final LiveConnectVisitorRepository visitorRepository;
    private final LiveConnectVisitorVisitRepository visitRepository;
    private final LiveConnectVisitorTagRepository visitorTagRepository;
    private final LiveConnectVisitorNoteRepository noteRepository;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectRequestRepository requestRepository;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectPageViewRepository pageViewRepository;
    private final LiveConnectVisitService visitService;

    /**
     * Gets paginated CRM visitor list with time-range filter, optional search,
     * stage filter, tag filter, and boolean filters.
     *
     * @param projectId      the project ID
     * @param days           number of days to look back (1, 3, 7, 30)
     * @param search         optional search term
     * @param stages         optional pipeline stages to filter by
     * @param tagIds         optional tag IDs for AND-logic filtering
     * @param hasBeenInCall  if true, only visitors with at least one video call
     * @param hasContactForm if true, only visitors who submitted a contact form
     * @param hasContactInfo if true, only visitors with name, email, or phone
     * @param repUpdatedInfo if true, only visitors whose contact was rep-edited
     * @param onlineNow      if true, only currently online visitors
     * @param page           page number (0-indexed)
     * @param size           page size
     * @param sort           sort field (lastSeenAt, leadScore, name, lastCallAt)
     * @param direction      sort direction (asc, desc)
     * @return paginated CRM visitor list
     */
    @Transactional(readOnly = true)
    public CrmVisitorListResponse getVisitors(UUID projectId, int days, String search,
                                               Set<PipelineStage> stages, Set<UUID> tagIds,
                                               boolean hasBeenInCall, boolean hasContactForm,
                                               boolean hasContactInfo, boolean repUpdatedInfo,
                                               boolean onlineNow,
                                               int page, int size, String sort, String direction) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortField = switch (sort) {
            case "leadScore" -> "leadScore";
            case "name" -> "name";
            case "lastCallAt" -> "lastCallAt";
            default -> "lastSeenAt";
        };
        PageRequest pageable = PageRequest.of(page, size, Sort.by(dir, sortField));

        Collection<PipelineStage> stageFilter = (stages != null && !stages.isEmpty()) ? stages : null;
        Collection<UUID> tagFilter = (tagIds != null && !tagIds.isEmpty()) ? tagIds : null;
        long tagCount = tagFilter != null ? tagFilter.size() : 0;
        OffsetDateTime onlineThreshold = OffsetDateTime.now().minusMinutes(2);

        Page<LiveConnectVisitor> visitors = visitorRepository.findForCrm(
                projectId, since, search, stageFilter, tagFilter, tagCount,
                hasBeenInCall, hasContactForm, hasContactInfo, repUpdatedInfo,
                onlineNow, onlineThreshold, pageable);

        if (visitors.isEmpty()) {
            return new CrmVisitorListResponse(List.of(), 0, 0, page, size);
        }

        // Batch load visit counts and tags
        Set<UUID> visitorIds = visitors.getContent().stream()
                .map(LiveConnectVisitor::getId)
                .collect(Collectors.toSet());

        Map<UUID, Long> visitCounts = visitRepository.countByVisitorIds(visitorIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));

        Map<UUID, List<TagDto>> tagMap = visitorTagRepository.findByVisitorIds(visitorIds).stream()
                .collect(Collectors.groupingBy(
                        vt -> vt.getVisitor().getId(),
                        Collectors.mapping(vt -> new TagDto(
                                vt.getTag().getId(),
                                vt.getTag().getName(),
                                vt.getTag().getColor()
                        ), Collectors.toList())
                ));

        List<CrmVisitorListItemDto> items = visitors.getContent().stream()
                .map(v -> new CrmVisitorListItemDto(
                        v.getId(),
                        v.getName(),
                        v.getEmail(),
                        v.getCountryCode(),
                        v.getCountry(),
                        v.getCity(),
                        v.getLastSeenAt(),
                        visitCounts.getOrDefault(v.getId(), 0L),
                        v.getLeadScore() != null ? v.getLeadScore() : 0,
                        v.getPipelineStage() != null ? v.getPipelineStage().name() : "NEW",
                        v.getAssignedRep() != null ? toRepDto(v.getAssignedRep()) : null,
                        tagMap.getOrDefault(v.getId(), List.of())
                ))
                .toList();

        return new CrmVisitorListResponse(items, visitors.getTotalElements(),
                visitors.getTotalPages(), page, size);
    }

    /**
     * Gets the full visitor CRM profile.
     *
     * @param visitorId the visitor's internal ID
     * @return full visitor CRM detail
     * @throws ResourceNotFoundException if visitor not found
     */
    @Transactional(readOnly = true)
    public CrmVisitorDetailDto getVisitorDetail(UUID visitorId) {
        LiveConnectVisitor v = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));

        List<TagDto> tags = visitorTagRepository.findByVisitorId(visitorId).stream()
                .map(vt -> new TagDto(vt.getTag().getId(), vt.getTag().getName(), vt.getTag().getColor()))
                .toList();

        VisitorVisitStatsDto visitStats = visitService.getVisitStats(visitorId);
        VisitorEngagementStatsDto engagementStats = visitService.getEngagementStats(visitorId);

        return new CrmVisitorDetailDto(
                v.getId(),
                v.getVisitorId(),
                v.getName(),
                v.getEmail(),
                v.getPhone(),
                v.getCountryCode(),
                v.getCountry(),
                v.getRegion(),
                v.getCity(),
                v.getBrowserName(),
                v.getBrowserVersion(),
                v.getOsName(),
                v.getOsVersion(),
                v.getDeviceType(),
                v.getIpAddress(),
                v.getFirstSeenAt(),
                v.getLastSeenAt(),
                v.getPipelineStage() != null ? v.getPipelineStage().name() : "NEW",
                v.getLeadScore() != null ? v.getLeadScore() : 0,
                v.getAssignedRep() != null ? toRepDto(v.getAssignedRep()) : null,
                tags,
                visitStats,
                engagementStats
        );
    }

    /**
     * Updates a visitor's pipeline stage.
     *
     * @param visitorId the visitor's internal ID
     * @param stage     the new pipeline stage
     * @throws ResourceNotFoundException if visitor not found
     */
    @Transactional
    public void updatePipelineStage(UUID visitorId, String stage) {
        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));
        visitor.setPipelineStage(PipelineStage.valueOf(stage));
        visitorRepository.save(visitor);
    }

    /**
     * Assigns a rep to a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @param repId     the rep ID to assign
     * @throws ResourceNotFoundException if visitor or rep not found
     */
    @Transactional
    public void assignRep(UUID visitorId, UUID repId) {
        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));
        LiveConnectRep rep = repRepository.findById(repId)
                .orElseThrow(() -> new ResourceNotFoundException("Rep not found"));
        visitor.setAssignedRep(rep);
        visitorRepository.save(visitor);
    }

    /**
     * Unassigns the rep from a visitor.
     *
     * @param visitorId the visitor's internal ID
     * @throws ResourceNotFoundException if visitor not found
     */
    @Transactional
    public void unassignRep(UUID visitorId) {
        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));
        visitor.setAssignedRep(null);
        visitorRepository.save(visitor);
    }

    /**
     * Gets a unified timeline of visitor events (visits, page views, conversations, requests, notes).
     *
     * @param visitorId the visitor's internal ID
     * @param page      page number (0-indexed)
     * @param size      page size
     * @return paginated timeline of events
     */
    @Transactional(readOnly = true)
    public TimelineResponse getTimeline(UUID visitorId, int page, int size) {
        // Gather all event types
        List<TimelineEventDto> allEvents = new ArrayList<>();

        // Visits
        visitRepository.findByVisitorIdOrderByStartedAtDesc(visitorId, PageRequest.of(0, 200))
                .forEach(visit -> allEvents.add(new TimelineEventDto(
                        "VISIT",
                        visit.getId(),
                        visit.getStartedAt(),
                        Map.of(
                                "endedAt", visit.getEndedAt() != null ? visit.getEndedAt().toString() : "",
                                "durationSeconds", visit.getEndedAt() != null
                                        ? java.time.Duration.between(visit.getStartedAt(), visit.getEndedAt()).toSeconds()
                                        : 0
                        )
                )));

        // Page views
        pageViewRepository.findByVisitorIdOrderByVisitedAtDesc(visitorId, PageRequest.of(0, 200))
                .forEach(pv -> allEvents.add(new TimelineEventDto(
                        "PAGE_VIEW",
                        UUID.nameUUIDFromBytes(("pv-" + pv.getId()).getBytes()),
                        pv.getVisitedAt(),
                        Map.of(
                                "url", pv.getUrl() != null ? pv.getUrl() : "",
                                "title", pv.getTitle() != null ? pv.getTitle() : ""
                        )
                )));

        // Conversations
        conversationRepository.findByVisitorId(visitorId)
                .forEach(conv -> allEvents.add(new TimelineEventDto(
                        conv.getType() == ConversationType.VIDEO_CALL ? "CALL" : "CONTACT_FORM",
                        conv.getId(),
                        conv.getStartedAt(),
                        Map.of(
                                "status", conv.getStatus().name(),
                                "endedAt", conv.getEndedAt() != null ? conv.getEndedAt().toString() : "",
                                "repName", conv.getRep() != null ? conv.getRep().getUser().getUsername() : ""
                        )
                )));

        // Notes
        noteRepository.findByVisitorIdOrderByCreatedAtDesc(visitorId, PageRequest.of(0, 200))
                .forEach(note -> allEvents.add(new TimelineEventDto(
                        "NOTE",
                        note.getId(),
                        note.getCreatedAt(),
                        Map.of(
                                "content", note.getContent(),
                                "authorName", note.getAuthorRep().getUser().getUsername()
                        )
                )));

        // Sort all events by timestamp descending
        allEvents.sort((a, b) -> b.timestamp().compareTo(a.timestamp()));

        // Paginate
        long totalElements = allEvents.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int start = page * size;
        int end = Math.min(start + size, allEvents.size());

        List<TimelineEventDto> pageEvents = start < allEvents.size()
                ? allEvents.subList(start, end)
                : List.of();

        return new TimelineResponse(pageEvents, totalElements, totalPages, page);
    }

    /**
     * Calculates and updates the lead score for a visitor.
     * Formula: min(100, (visitsLast7d * 5) + recencyBonus)
     * Recency: <1h = 25pts, <24h = 15pts, <3d = 10pts, <7d = 5pts, else 0
     *
     * @param visitorId the visitor's internal ID
     */
    @Transactional
    public void calculateLeadScore(UUID visitorId) {
        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));

        OffsetDateTime now = OffsetDateTime.now();
        long visitsLast7d = visitRepository.countByVisitorIdSince(visitorId, now.minusDays(7));

        int recencyBonus = 0;
        if (visitor.getLastSeenAt() != null) {
            long hoursSinceLastSeen = java.time.Duration.between(visitor.getLastSeenAt(), now).toHours();
            if (hoursSinceLastSeen < 1) {
                recencyBonus = 25;
            } else if (hoursSinceLastSeen < 24) {
                recencyBonus = 15;
            } else if (hoursSinceLastSeen < 72) {
                recencyBonus = 10;
            } else if (hoursSinceLastSeen < 168) {
                recencyBonus = 5;
            }
        }

        int score = (int) Math.min(100, (visitsLast7d * 5) + recencyBonus);
        visitor.setLeadScore(score);
        visitorRepository.save(visitor);
    }

    /**
     * Converts a LiveConnectRep entity to a LiveConnectRepDto.
     */
    private LiveConnectRepDto toRepDto(LiveConnectRep rep) {
        return new LiveConnectRepDto(
                rep.getId(),
                rep.getUser().getId(),
                rep.getUser().getUsername(),
                rep.getUser().getEmail(),
                rep.getAvailability().name(),
                rep.getPresence().name(),
                rep.getCreatedAt()
        );
    }

    /**
     * Patches visitor contact fields using PATCH semantics.
     * Null fields are ignored (not updated). Empty string clears the field.
     * Tracks which rep made the change and when for CRM filtering.
     *
     * @param visitorId the visitor's internal ID
     * @param request   the contact fields to patch
     * @param rep       the rep making the update
     * @throws ResourceNotFoundException if visitor not found
     */
    @Transactional
    public void updateVisitorContact(UUID visitorId, UpdateVisitorContactRequest request, LiveConnectRep rep) {
        LiveConnectVisitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found"));

        if (request.name() != null) visitor.setName(request.name());
        if (request.email() != null) visitor.setEmail(request.email());
        if (request.phone() != null) visitor.setPhone(request.phone());

        visitor.setContactUpdatedAt(OffsetDateTime.now());
        visitor.setContactUpdatedByRep(rep);

        visitorRepository.save(visitor);
    }

}
