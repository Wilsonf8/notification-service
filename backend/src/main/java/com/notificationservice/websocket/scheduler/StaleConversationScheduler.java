package com.notificationservice.websocket.scheduler;

import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.service.LiveKitRoomService;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.CallEndedBroadcastEvent;
import com.notificationservice.websocket.event.CallEndedEvent;
import com.notificationservice.websocket.event.RepStatusChangedEvent;
import com.notificationservice.websocket.session.VisitorSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

/**
 * Scheduler that cleans up stale ACTIVE conversations.
 * Runs every 5 minutes to compare database conversations against
 * actual active rooms in LiveKit, ending any that no longer exist.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StaleConversationScheduler {

    private final LiveKitRoomService liveKitRoomService;
    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectRepRepository repRepository;
    private final WebSocketBroadcaster broadcaster;
    private final VisitorSessionManager visitorSessionManager;

    /**
     * Cleans up stale conversations every 5 minutes.
     * Compares ACTIVE conversations in DB against active rooms in LiveKit
     * and ends any conversations whose room no longer exists.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void cleanupStaleConversations() {
        Set<String> activeRooms = liveKitRoomService.getActiveRoomNames();
        List<LiveConnectConversation> activeConversations = conversationRepository.findAllActive();

        if (activeConversations.isEmpty()) {
            return;
        }

        log.debug("Checking {} active conversations against {} LiveKit rooms",
                activeConversations.size(), activeRooms.size());

        int cleaned = 0;
        for (LiveConnectConversation conversation : activeConversations) {
            String roomName = conversation.getLiveKitRoomName();
            if (roomName != null && !activeRooms.contains(roomName)) {
                endStaleConversation(conversation);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            log.info("Cleaned up {} stale conversations", cleaned);
        }
    }

    /**
     * Ends a stale conversation and notifies participants.
     *
     * @param conversation the conversation to end
     */
    private void endStaleConversation(LiveConnectConversation conversation) {
        log.info("Ending stale conversation {} (room: {})",
                conversation.getId(), conversation.getLiveKitRoomName());

        OffsetDateTime now = OffsetDateTime.now();

        // Calculate duration
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

            // Broadcast rep status change to all reps in the project
            RepStatusChangedEvent repStatusEvent = new RepStatusChangedEvent(
                    rep.getId(),
                    rep.getUser().getId(),
                    rep.getUser().getUsername(),
                    rep.getUser().getEmail(),
                    rep.getAvailability().name(),
                    rep.getPresence().name()
            );
            broadcaster.broadcastToProject(conversation.getProject().getId(), repStatusEvent);
        }

        // Update visitor engagement state back to BROWSING
        if (conversation.getVisitor() != null) {
            visitorSessionManager.setVisitorState(conversation.getVisitor().getId(), VisitorSessionManager.VisitorEngagementState.BROWSING);
        }

        // Broadcast to visitor
        if (conversation.getVisitor() != null) {
            broadcaster.sendToVisitor(
                    conversation.getVisitor().getId(),
                    new CallEndedEvent(conversation.getId(), conversation.getCallDurationSeconds())
            );
        }

        // Broadcast to rep
        if (conversation.getRep() != null) {
            broadcaster.sendToRep(
                    conversation.getRep().getUser().getId(),
                    new CallEndedEvent(conversation.getId(), conversation.getCallDurationSeconds())
            );
        }

        // Broadcast call ended to all reps in project
        CallEndedBroadcastEvent broadcastEvent = new CallEndedBroadcastEvent(conversation.getId());
        broadcaster.broadcastToProject(conversation.getProject().getId(), broadcastEvent);
    }
}
