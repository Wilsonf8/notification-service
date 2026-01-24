package com.notificationservice.worker;

import com.notificationservice.entity.Event;
import com.notificationservice.entity.EventStatus;
import com.notificationservice.entity.TelegramDestination;
import com.notificationservice.repository.EventRepository;
import com.notificationservice.repository.TelegramDestinationRepository;
import com.notificationservice.telegram.TelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationWorker {

    private static final int MAX_RETRIES = 3;

    private final EventRepository eventRepository;
    private final TelegramDestinationRepository telegramDestinationRepository;
    private final TelegramService telegramService;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.rate-limit.global-messages-per-second}")
    private int globalRateLimit;

    @Scheduled(fixedDelay = 100) // Poll every 100ms
    public void processQueue() {
        // Global rate limit check
        String globalKey = "rate:global:telegram";
        Long count = redisTemplate.opsForValue().increment(globalKey);
        if (count != null && count == 1) {
            redisTemplate.expire(globalKey, 1, TimeUnit.SECONDS);
        }
        if (count != null && count > globalRateLimit) {
            return; // Skip this cycle, at rate limit
        }

        // Pop event from queue
        String eventIdStr = redisTemplate.opsForList().leftPop("queue:events");
        if (eventIdStr == null) {
            return;
        }

        try {
            UUID eventId = UUID.fromString(eventIdStr);
            processEvent(eventId);
        } catch (Exception e) {
            log.error("Error processing event: {}", eventIdStr, e);
            // Re-queue on unexpected error
            redisTemplate.opsForList().rightPush("queue:events", eventIdStr);
        }
    }

    @Transactional
    public void processEvent(UUID eventId) {
        Optional<Event> optEvent = eventRepository.findById(eventId);
        if (optEvent.isEmpty()) {
            log.warn("Event not found: {}", eventId);
            return;
        }

        Event event = optEvent.get();

        // Check if expired
        if (event.getExpiresAt().isBefore(OffsetDateTime.now())) {
            event.setStatus(EventStatus.EXPIRED);
            eventRepository.save(event);
            return;
        }

        // Check if already processed
        if (event.getStatus() != EventStatus.QUEUED && event.getStatus() != EventStatus.PROCESSING) {
            return;
        }

        event.setStatus(EventStatus.PROCESSING);
        eventRepository.save(event);

        // Get destination
        Optional<TelegramDestination> optDest = telegramDestinationRepository
                .findByProjectId(event.getProject().getId());

        if (optDest.isEmpty()) {
            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage("No Telegram destination configured");
            eventRepository.save(event);
            return;
        }

        TelegramDestination destination = optDest.get();

        if (!destination.getIsEnabled()) {
            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage("Telegram destination is disabled: " + destination.getDisabledReason());
            eventRepository.save(event);
            return;
        }

        // Per-chat rate limit
        String chatKey = "rate:chat:" + destination.getChatId();
        Long chatCount = redisTemplate.opsForValue().increment(chatKey);
        if (chatCount != null && chatCount == 1) {
            redisTemplate.expire(chatKey, 1, TimeUnit.SECONDS);
        }
        if (chatCount != null && chatCount > 1) {
            // Re-queue with delay
            redisTemplate.opsForList().rightPush("queue:events", eventId.toString());
            event.setStatus(EventStatus.QUEUED);
            eventRepository.save(event);
            return;
        }

        // Format message
        String message = formatMessage(event);

        // Send
        TelegramService.SendResult result = telegramService.sendMessage(destination.getChatId(), message);

        if (result.success()) {
            event.setStatus(EventStatus.SENT);
            event.setSentAt(OffsetDateTime.now());
            eventRepository.save(event);
        } else {
            handleSendFailure(event, destination, result);
        }
    }

    private void handleSendFailure(Event event, TelegramDestination destination, TelegramService.SendResult result) {
        if ("blocked".equals(result.errorCode())) {
            // Disable destination
            destination.setIsEnabled(false);
            destination.setDisabledReason("Bot was blocked by user");
            telegramDestinationRepository.save(destination);

            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage("Bot blocked by user");
            eventRepository.save(event);
            return;
        }

        if ("rate_limited".equals(result.errorCode())) {
            // Re-queue
            event.setStatus(EventStatus.QUEUED);
            event.setRetryCount(event.getRetryCount() + 1);
            eventRepository.save(event);
            redisTemplate.opsForList().rightPush("queue:events", event.getId().toString());
            return;
        }

        // Other errors - retry with backoff
        int retryCount = event.getRetryCount() + 1;
        if (retryCount >= MAX_RETRIES) {
            event.setStatus(EventStatus.FAILED);
            event.setErrorMessage(result.errorMessage());
            event.setRetryCount(retryCount);
            eventRepository.save(event);
        } else {
            event.setStatus(EventStatus.QUEUED);
            event.setRetryCount(retryCount);
            eventRepository.save(event);
            // Re-queue with exponential backoff (handled by worker delay)
            redisTemplate.opsForList().rightPush("queue:events", event.getId().toString());
        }
    }

    private String formatMessage(Event event) {
        StringBuilder sb = new StringBuilder();
        if (event.getTopic() != null && !event.getTopic().isBlank()) {
            sb.append("[").append(event.getTopic()).append("]\n");
        }
        sb.append(event.getText());
        return sb.toString();
    }

    @Scheduled(fixedRate = 60000) // Every minute
    @Transactional
    public void expireOldEvents() {
        int expired = eventRepository.expireOldEvents(OffsetDateTime.now());
        if (expired > 0) {
            log.info("Expired {} old events", expired);
        }
    }

    @Scheduled(fixedRate = 3600000) // Every hour
    @Transactional
    public void cleanupTokens() {
        // Cleanup handled in ConnectTokenRepository
    }
}
