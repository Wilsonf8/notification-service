package com.notificationservice.controller;

import com.notificationservice.config.LiveKitProperties;
import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectProcessedWebhook;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectProcessedWebhookRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.CallEndedEvent;
import io.livekit.server.WebhookReceiver;
import livekit.LivekitWebhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Controller for handling LiveKit webhook events.
 * Processes room lifecycle events to sync conversation state.
 */
@RestController
@RequestMapping("/webhooks/livekit")
@RequiredArgsConstructor
@Slf4j
public class LiveKitWebhookController {

    private final LiveKitProperties properties;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectRepRepository repRepository;
    private final LiveConnectProcessedWebhookRepository processedWebhookRepository;
    private final WebSocketBroadcaster broadcaster;

    /**
     * Handles incoming LiveKit webhook events.
     *
     * @param rawBody the raw request body
     * @param authHeader the Authorization header containing the webhook signature
     * @return 200 OK on success, 401 if signature is invalid
     */
    @PostMapping(consumes = "application/webhook+json")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader("Authorization") String authHeader) {

        // Validate webhook signature
        WebhookReceiver receiver = new WebhookReceiver(
                properties.apiKey(),
                properties.apiSecret()
        );

        LivekitWebhook.WebhookEvent event;
        try {
            event = receiver.receive(rawBody, authHeader);
        } catch (Exception e) {
            log.warn("Invalid webhook signature: {}", e.getMessage());
            return ResponseEntity.status(401).build();
        }

        // Deduplicate events
        String eventId = event.getId();
        if (processedWebhookRepository.existsByEventId(eventId)) {
            log.debug("Duplicate webhook event ignored: {}", eventId);
            return ResponseEntity.ok().build();
        }

        // Process the event
        processEvent(event);

        // Mark as processed
        processedWebhookRepository.save(
                LiveConnectProcessedWebhook.builder()
                        .eventId(eventId)
                        .eventType(event.getEvent())
                        .build()
        );

        return ResponseEntity.ok().build();
    }

    private void processEvent(LivekitWebhook.WebhookEvent event) {
        String eventType = event.getEvent();
        log.debug("Processing LiveKit webhook event: {}", eventType);

        switch (eventType) {
            case "room_finished" -> handleRoomFinished(event);
            case "participant_left" -> handleParticipantLeft(event);
            default -> log.debug("Ignoring event type: {}", eventType);
        }
    }

    private void handleRoomFinished(LivekitWebhook.WebhookEvent event) {
        String roomName = event.getRoom().getName();
        log.info("Room finished: {}", roomName);

        conversationRepository.findByLiveKitRoomName(roomName).ifPresent(conversation -> {
            if (conversation.getStatus() == ConversationStatus.ACTIVE) {
                endConversation(conversation);
            }
        });
    }

    private void handleParticipantLeft(LivekitWebhook.WebhookEvent event) {
        String participantIdentity = event.getParticipant().getIdentity();
        String roomName = event.getRoom().getName();
        log.info("Participant left room {}: {}", roomName, participantIdentity);
        // Could implement grace period logic here in the future
    }

    private void endConversation(LiveConnectConversation conversation) {
        log.info("Ending conversation {} due to room finished", conversation.getId());

        // Calculate duration
        OffsetDateTime now = OffsetDateTime.now();
        if (conversation.getStartedAt() != null) {
            long durationSeconds = ChronoUnit.SECONDS.between(conversation.getStartedAt(), now);
            conversation.setCallDurationSeconds((int) durationSeconds);
        }

        // Update conversation status
        conversation.setStatus(ConversationStatus.ENDED);
        conversation.setEndedAt(now);
        conversationRepository.save(conversation);

        // Clear rep state
        if (conversation.getRep() != null) {
            LiveConnectRep rep = conversation.getRep();
            rep.setCurrentConversation(null);
            rep.setPresence(RepPresence.ONLINE);
            rep.setCallStartedAt(null);
            repRepository.save(rep);
        }

        // Broadcast to visitor
        broadcaster.sendToVisitor(
                conversation.getVisitor().getId(),
                new CallEndedEvent(conversation.getId(), conversation.getCallDurationSeconds())
        );

        // Broadcast to rep
        if (conversation.getRep() != null) {
            broadcaster.sendToRep(
                    conversation.getRep().getUser().getId(),
                    new CallEndedEvent(conversation.getId(), conversation.getCallDurationSeconds())
            );
        }
    }
}
