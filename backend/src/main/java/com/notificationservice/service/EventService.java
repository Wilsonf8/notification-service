package com.notificationservice.service;

import com.notificationservice.dto.*;
import com.notificationservice.entity.ApiKey;
import com.notificationservice.entity.Event;
import com.notificationservice.entity.EventStatus;
import com.notificationservice.entity.Project;
import com.notificationservice.repository.EventRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.rate-limit.ingestion-per-project-per-second}")
    private int ingestionRateLimit;

    @Value("${app.rate-limit.max-queued-per-project}")
    private long maxQueuedPerProject;

    @Value("${app.event.expiration-minutes}")
    private int expirationMinutes;

    @Transactional
    public NotifyResponse createEvent(NotifyRequest request, ApiKey apiKey) {
        UUID projectId = apiKey.getProject().getId();

        // Check idempotency
        if (request.idempotencyKey() != null) {
            Optional<Event> existing = eventRepository
                    .findByProjectIdAndIdempotencyKey(projectId, request.idempotencyKey());
            if (existing.isPresent()) {
                Event e = existing.get();
                return new NotifyResponse(e.getId(), e.getStatus().name().toLowerCase());
            }
        }

        // Check rate limit
        String rateLimitKey = "rate:ingestion:" + projectId;
        Long currentCount = redisTemplate.opsForValue().increment(rateLimitKey);
        if (currentCount != null && currentCount == 1) {
            redisTemplate.expire(rateLimitKey, 1, TimeUnit.SECONDS);
        }
        if (currentCount != null && currentCount > ingestionRateLimit) {
            throw new RateLimitExceededException("Rate limit exceeded. Max " + ingestionRateLimit + " events/second");
        }

        // Check queue depth
        long queuedCount = eventRepository.countQueuedByProjectId(projectId);
        if (queuedCount >= maxQueuedPerProject) {
            throw new RateLimitExceededException("Queue full. Max " + maxQueuedPerProject + " queued events");
        }

        // Truncate message if needed (Telegram limit is ~4096, leave room for formatting)
        String text = request.text();
        if (text.length() > 3500) {
            text = text.substring(0, 3500) + "... (truncated)";
        }

        Event event = Event.builder()
                .project(apiKey.getProject())
                .apiKey(apiKey)
                .idempotencyKey(request.idempotencyKey())
                .text(text)
                .topic(request.topic())
                .expiresAt(OffsetDateTime.now().plus(expirationMinutes, ChronoUnit.MINUTES))
                .build();

        eventRepository.save(event);

        // Push to Redis queue for worker
        redisTemplate.opsForList().rightPush("queue:events", event.getId().toString());

        return new NotifyResponse(event.getId(), "queued");
    }

    @Transactional(readOnly = true)
    public EventsPageDto getEventsForProject(UUID projectId, UUID userId, int page, int size) {
        verifyProjectAccess(projectId, userId);

        OffsetDateTime since = OffsetDateTime.now().minusDays(7);
        Page<Event> eventPage = eventRepository.findByProjectIdAndCreatedAtAfter(
                projectId, since, PageRequest.of(page, size));

        return new EventsPageDto(
                eventPage.getContent().stream().map(this::toDto).toList(),
                page,
                size,
                eventPage.getTotalElements(),
                eventPage.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public ProjectStatsDto getStatsForProject(UUID projectId, UUID userId) {
        verifyProjectAccess(projectId, userId);

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime todayStart = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime weekStart = now.minusDays(7);
        OffsetDateTime monthStart = now.minusDays(30);

        long todayTotal = eventRepository.countByProjectIdSince(projectId, todayStart);
        long todaySent = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.SENT, todayStart);
        long todayFailed = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.FAILED, todayStart);

        long weekTotal = eventRepository.countByProjectIdSince(projectId, weekStart);
        long weekSent = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.SENT, weekStart);
        long weekFailed = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.FAILED, weekStart);

        long monthTotal = eventRepository.countByProjectIdSince(projectId, monthStart);
        long monthSent = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.SENT, monthStart);
        long monthFailed = eventRepository.countByProjectIdAndStatusSince(projectId, EventStatus.FAILED, monthStart);

        double successRate = monthTotal > 0 ? (double) monthSent / monthTotal * 100 : 0;

        return new ProjectStatsDto(
                todayTotal, todaySent, todayFailed,
                weekTotal, weekSent, weekFailed,
                monthTotal, monthSent, monthFailed,
                successRate
        );
    }

    private Project verifyProjectAccess(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(
                project.getOrganization().getId(), userId);
        if (!isMember) {
            throw new AccessDeniedException("You don't have access to this project");
        }
        return project;
    }

    private EventDto toDto(Event event) {
        return new EventDto(
                event.getId(),
                event.getText(),
                event.getTopic(),
                event.getStatus(),
                event.getErrorMessage(),
                event.getCreatedAt(),
                event.getSentAt()
        );
    }
}
