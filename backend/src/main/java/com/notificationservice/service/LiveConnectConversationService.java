package com.notificationservice.service;

import com.notificationservice.dto.ConversationListResponse;
import com.notificationservice.dto.LiveConnectConversationDto;
import com.notificationservice.dto.LiveConnectMessageDto;
import com.notificationservice.dto.LiveConnectRepDto;
import com.notificationservice.dto.LiveConnectVisitorDto;
import com.notificationservice.dto.MessageListResponse;
import com.notificationservice.dto.MessageResponse;
import com.notificationservice.dto.SendMessageRequest;
import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.ConversationType;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectMessage;
import com.notificationservice.entity.LiveConnectRep;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.MessageSenderType;
import com.notificationservice.entity.Project;
import com.notificationservice.entity.ProjectType;
import com.notificationservice.entity.RepPresence;
import com.notificationservice.entity.User;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectMessageRepository;
import com.notificationservice.repository.LiveConnectRepRepository;
import com.notificationservice.repository.OrganizationMemberRepository;
import com.notificationservice.repository.ProjectRepository;
import com.notificationservice.websocket.broadcast.WebSocketBroadcaster;
import com.notificationservice.websocket.event.CallEndedBroadcastEvent;
import com.notificationservice.websocket.event.CallEndedEvent;
import com.notificationservice.websocket.event.MessageReceivedEvent;
import com.notificationservice.websocket.event.RepAvailabilityChangedEvent;
import com.notificationservice.websocket.event.RepStatusChangedEvent;
import com.notificationservice.websocket.event.VisitorJoinedEvent;
import com.notificationservice.websocket.session.VisitorSessionManager;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing LiveConnect conversations.
 */
@Service
@RequiredArgsConstructor
public class LiveConnectConversationService {

    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectMessageRepository messageRepository;
    private final LiveConnectRepRepository repRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final WebSocketBroadcaster broadcaster;
    private final VisitorSessionManager visitorSessionManager;

    /**
     * Gets paginated conversations for a project.
     *
     * @param projectId the project ID
     * @param userId the requesting user's ID
     * @param page the page number (0-indexed)
     * @param size the page size
     * @param status optional status filter (ACTIVE, ENDED)
     * @param type optional type filter (VIDEO_CALL, CONTACT_FORM)
     * @return paginated list of conversations
     * @throws ResourceNotFoundException if project not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional(readOnly = true)
    public ConversationListResponse getConversations(
            UUID projectId,
            UUID userId,
            int page,
            int size,
            String status,
            String type) {

        getAndValidateProject(projectId, userId);
        Pageable pageable = PageRequest.of(page, size);

        Page<LiveConnectConversation> conversationPage;

        ConversationStatus statusEnum = status != null ? ConversationStatus.valueOf(status.toUpperCase()) : null;
        ConversationType typeEnum = type != null ? ConversationType.valueOf(type.toUpperCase()) : null;

        if (statusEnum != null && typeEnum != null) {
            conversationPage = conversationRepository.findByProjectIdAndStatusAndType(
                    projectId, statusEnum, typeEnum, pageable);
        } else if (statusEnum != null) {
            conversationPage = conversationRepository.findByProjectIdAndStatusPaged(
                    projectId, statusEnum, pageable);
        } else if (typeEnum != null) {
            conversationPage = conversationRepository.findByProjectIdAndType(
                    projectId, typeEnum, pageable);
        } else {
            conversationPage = conversationRepository.findByProjectId(projectId, pageable);
        }

        // Batch-load message counts to avoid N+1 queries
        List<LiveConnectConversation> conversations = conversationPage.getContent();
        Set<UUID> conversationIds = conversations.stream()
                .map(LiveConnectConversation::getId)
                .collect(Collectors.toSet());
        Map<UUID, Long> messageCounts = conversationIds.isEmpty()
                ? Map.of()
                : messageRepository.countByConversationIds(conversationIds).stream()
                        .collect(Collectors.toMap(
                                row -> (UUID) row[0],
                                row -> (Long) row[1]
                        ));

        return new ConversationListResponse(
                conversations.stream()
                        .map(c -> toConversationDto(c, messageCounts.getOrDefault(c.getId(), 0L)))
                        .toList(),
                conversationPage.getNumber(),
                conversationPage.getSize(),
                conversationPage.getTotalElements(),
                conversationPage.getTotalPages()
        );
    }

    /**
     * Gets a single conversation by ID.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param userId the requesting user's ID
     * @return the conversation details
     * @throws ResourceNotFoundException if project or conversation not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional(readOnly = true)
    public LiveConnectConversationDto getConversation(UUID projectId, UUID conversationId, UUID userId) {
        getAndValidateProject(projectId, userId);

        LiveConnectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (!conversation.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Conversation not found");
        }

        return toConversationDto(conversation);
    }

    /**
     * Gets paginated messages for a conversation.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param userId the requesting user's ID
     * @param page the page number (0-indexed)
     * @param size the page size
     * @return paginated list of messages
     * @throws ResourceNotFoundException if project or conversation not found
     * @throws IllegalArgumentException if project is not LIVECONNECT type
     * @throws AccessDeniedException if user is not a member of the organization
     */
    @Transactional(readOnly = true)
    public MessageListResponse getMessages(
            UUID projectId,
            UUID conversationId,
            UUID userId,
            int page,
            int size) {

        getAndValidateProject(projectId, userId);

        LiveConnectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (!conversation.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Conversation not found");
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<LiveConnectMessage> messagePage = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, pageable);

        return new MessageListResponse(
                messagePage.getContent().stream()
                        .map(msg -> toMessageDto(msg, conversation))
                        .toList(),
                messagePage.getNumber(),
                messagePage.getSize(),
                messagePage.getTotalElements(),
                messagePage.getTotalPages()
        );
    }

    /**
     * Sends a message in a conversation. Only the assigned rep can send messages
     * during an active conversation.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param request the message request
     * @param userId the requesting user's ID (must be the assigned rep)
     * @return the created message
     * @throws ResourceNotFoundException if project or conversation not found
     * @throws IllegalArgumentException if conversation is not active or user is not the assigned rep
     */
    @Transactional
    public LiveConnectMessageDto sendMessage(
            UUID projectId,
            UUID conversationId,
            SendMessageRequest request,
            UUID userId) {

        projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        LiveConnectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (!conversation.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Conversation not found");
        }

        if (conversation.getStatus() != ConversationStatus.ACTIVE) {
            throw new IllegalArgumentException("Cannot send messages to an ended conversation");
        }

        LiveConnectRep rep = conversation.getRep();
        if (rep == null || !rep.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Only the assigned rep can send messages");
        }

        LiveConnectMessage message = LiveConnectMessage.builder()
                .conversation(conversation)
                .senderType(MessageSenderType.REP)
                .senderId(userId)
                .content(request.content())
                .build();
        message = messageRepository.saveAndFlush(message);

        conversation.setLastActivityAt(OffsetDateTime.now());
        conversationRepository.save(conversation);

        // Use client's messageId for broadcast when provided (for dedup with data channel)
        UUID broadcastId = request.messageId() != null
                ? UUID.fromString(request.messageId())
                : message.getId();
        MessageReceivedEvent event = new MessageReceivedEvent(
                conversationId,
                broadcastId,
                MessageSenderType.REP.name(),
                getUserDisplayName(rep.getUser()),
                request.content(),
                message.getCreatedAt()
        );
        broadcaster.sendToVisitor(conversation.getVisitor().getId(), event);

        return toMessageDto(message, conversation);
    }

    /**
     * Ends an active conversation. Only the assigned rep can end the conversation.
     *
     * @param projectId the project ID
     * @param conversationId the conversation ID
     * @param userId the requesting user's ID (must be the assigned rep)
     * @throws ResourceNotFoundException if project or conversation not found
     * @throws IllegalArgumentException if conversation is not active or user is not the assigned rep
     */
    @Transactional
    public void endConversation(UUID projectId, UUID conversationId, UUID userId) {
        projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        LiveConnectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (!conversation.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Conversation not found");
        }

        if (conversation.getStatus() != ConversationStatus.ACTIVE) {
            throw new IllegalArgumentException("Conversation is already ended");
        }

        LiveConnectRep rep = conversation.getRep();
        if (rep == null || !rep.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Only the assigned rep can end the conversation");
        }

        OffsetDateTime now = OffsetDateTime.now();

        conversation.setStatus(ConversationStatus.ENDED);
        conversation.setEndedAt(now);

        if (conversation.getStartedAt() != null) {
            long durationSeconds = ChronoUnit.SECONDS.between(conversation.getStartedAt(), now);
            conversation.setCallDurationSeconds((int) durationSeconds);
        }

        conversationRepository.save(conversation);

        rep.setCurrentConversation(null);
        rep.setPresence(RepPresence.ONLINE);
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

        // Update visitor engagement state back to BROWSING
        visitorSessionManager.setVisitorState(conversation.getVisitor().getId(), VisitorSessionManager.VisitorEngagementState.BROWSING);

        // Broadcast rep availability change to visitors
        UUID projectIdForAvailability = conversation.getProject().getId();
        boolean hasAvailableReps = repRepository.hasAnyAvailableReps(projectIdForAvailability);
        RepAvailabilityChangedEvent availabilityEvent = new RepAvailabilityChangedEvent(hasAvailableReps);
        broadcaster.broadcastToProjectVisitors(projectIdForAvailability, availabilityEvent);

        // Broadcast call ended to visitor
        CallEndedEvent event = new CallEndedEvent(
                conversationId,
                conversation.getCallDurationSeconds()
        );
        broadcaster.sendToVisitor(conversation.getVisitor().getId(), event);

        // Broadcast call ended to all reps in project
        CallEndedBroadcastEvent broadcastEvent = new CallEndedBroadcastEvent(conversationId);
        broadcaster.broadcastToProject(conversation.getProject().getId(), broadcastEvent);

        // Re-broadcast visitor presence if still connected
        LiveConnectVisitor visitor = conversation.getVisitor();
        if (visitor.getActiveConnections() != null && visitor.getActiveConnections() > 0) {
            String currentPage = visitor.getMetadata() != null
                    ? (String) visitor.getMetadata().get("currentPage")
                    : null;
            VisitorJoinedEvent visitorJoinedEvent = new VisitorJoinedEvent(
                    visitor.getId(),
                    visitor.getName(),
                    visitor.getEmail(),
                    currentPage,
                    OffsetDateTime.now(),
                    false,
                    null,
                    0,
                    visitor.getCountryCode(),
                    visitor.getCountry(),
                    visitor.getCity(),
                    visitor.getBrowserName(),
                    visitor.getOsName(),
                    visitor.getDeviceType()
            );
            broadcaster.broadcastToProject(
                    conversation.getProject().getId(),
                    visitorJoinedEvent
            );
        }
    }

    /**
     * Sends a message from a visitor in an active conversation.
     *
     * @param conversationId the conversation ID
     * @param visitorId the visitor's internal ID
     * @param content the message content
     * @param messageId optional client-generated UUID for deduplication with data channel messages
     * @return the created message response
     * @throws ResourceNotFoundException if conversation not found
     * @throws AccessDeniedException if visitor doesn't own the conversation
     * @throws IllegalArgumentException if conversation is not active
     */
    @Transactional
    public MessageResponse sendVisitorMessage(UUID conversationId, UUID visitorId, String content, String messageId) {
        LiveConnectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        // Verify visitor owns this conversation
        if (!conversation.getVisitor().getId().equals(visitorId)) {
            throw new AccessDeniedException("You do not own this conversation");
        }

        // Verify conversation is active
        if (conversation.getStatus() != ConversationStatus.ACTIVE) {
            throw new IllegalArgumentException("Cannot send messages to an ended conversation");
        }

        LiveConnectMessage message = LiveConnectMessage.builder()
                .conversation(conversation)
                .senderType(MessageSenderType.USER)
                .senderId(visitorId)
                .content(content)
                .build();
        message = messageRepository.saveAndFlush(message);

        conversation.setLastActivityAt(OffsetDateTime.now());
        conversationRepository.save(conversation);

        // Use client's messageId for broadcast when provided (for dedup with data channel)
        UUID broadcastId = messageId != null
                ? UUID.fromString(messageId)
                : message.getId();

        // Broadcast message to rep
        LiveConnectVisitor visitor = conversation.getVisitor();
        LiveConnectRep rep = conversation.getRep();
        if (rep != null) {
            MessageReceivedEvent event = new MessageReceivedEvent(
                    conversationId,
                    broadcastId,
                    MessageSenderType.USER.name(),
                    visitor.getName() != null ? visitor.getName() : "Visitor",
                    content,
                    message.getCreatedAt()
            );
            broadcaster.sendToRep(rep.getUser().getId(), event);
        }

        return new MessageResponse(message.getId(), message.getCreatedAt());
    }

    /**
     * Retrieves all messages for a conversation, ordered chronologically.
     * Used by the visitor widget when loading chat history (e.g., pop-out tab).
     *
     * @param conversationId the conversation ID
     * @param visitorId the visitor's internal ID
     * @return list of messages in chronological order
     * @throws ResourceNotFoundException if conversation not found
     * @throws AccessDeniedException if visitor doesn't own the conversation
     */
    @Transactional(readOnly = true)
    public List<LiveConnectMessageDto> getVisitorMessages(UUID conversationId, UUID visitorId) {
        LiveConnectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (!conversation.getVisitor().getId().equals(visitorId)) {
            throw new AccessDeniedException("You do not own this conversation");
        }

        List<LiveConnectMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        return messages.stream().map(msg -> toMessageDto(msg, conversation)).toList();
    }

    /**
     * Gets paginated conversations for a specific visitor.
     *
     * @param projectId the project ID (for context/logging)
     * @param visitorId the visitor's internal ID
     * @param page the page number (0-indexed)
     * @param size the page size
     * @return paginated list of conversations for the visitor
     */
    @Transactional(readOnly = true)
    public ConversationListResponse getVisitorConversations(UUID projectId, UUID visitorId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<LiveConnectConversation> conversationPage = conversationRepository.findByVisitorIdPaged(visitorId, pageable);

        // Batch-load message counts to avoid N+1 queries
        List<LiveConnectConversation> conversations = conversationPage.getContent();
        Set<UUID> conversationIds = conversations.stream()
                .map(LiveConnectConversation::getId)
                .collect(Collectors.toSet());
        Map<UUID, Long> messageCounts = conversationIds.isEmpty()
                ? Map.of()
                : messageRepository.countByConversationIds(conversationIds).stream()
                        .collect(Collectors.toMap(
                                row -> (UUID) row[0],
                                row -> (Long) row[1]
                        ));

        return new ConversationListResponse(
                conversations.stream()
                        .map(c -> toConversationDto(c, messageCounts.getOrDefault(c.getId(), 0L)))
                        .toList(),
                conversationPage.getNumber(),
                conversationPage.getSize(),
                conversationPage.getTotalElements(),
                conversationPage.getTotalPages()
        );
    }

    private Project getAndValidateProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findByIdAndNotDeleted(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (project.getType() != ProjectType.LIVECONNECT) {
            throw new IllegalArgumentException("Project is not a LiveConnect project");
        }

        boolean isMember = organizationMemberRepository.existsByOrganizationIdAndUserId(
                project.getOrganization().getId(), userId);
        if (!isMember) {
            throw new AccessDeniedException("You are not a member of this organization");
        }

        return project;
    }

    /**
     * Converts a conversation entity to DTO, loading message count from DB.
     * Use the overload with pre-loaded messageCount for batch operations.
     */
    private LiveConnectConversationDto toConversationDto(LiveConnectConversation conversation) {
        long messageCount = messageRepository.countByConversationId(conversation.getId());
        return toConversationDto(conversation, messageCount);
    }

    /**
     * Converts a conversation entity to DTO with a pre-loaded message count.
     * Avoids N+1 queries when called in a loop with batch-loaded counts.
     */
    private LiveConnectConversationDto toConversationDto(LiveConnectConversation conversation, long messageCount) {
        LiveConnectVisitor visitor = conversation.getVisitor();
        LiveConnectRep rep = conversation.getRep();

        // Compute isConnected from activeConnections
        boolean isConnected = visitor.getActiveConnections() != null
                && visitor.getActiveConnections() > 0;

        // Compute isPingable: connected AND not in cooldown
        boolean isPingable = isConnected && (
                visitor.getPingCooldownUntil() == null
                || visitor.getPingCooldownUntil().isBefore(OffsetDateTime.now())
        );

        LiveConnectVisitorDto visitorDto = new LiveConnectVisitorDto(
                visitor.getId(),
                visitor.getVisitorId(),
                visitor.getName(),
                visitor.getEmail(),
                visitor.getMetadata() != null ? (String) visitor.getMetadata().get("currentPage") : null,
                visitor.getLastSeenAt(),
                false,
                isConnected,
                isPingable,
                false,
                null,
                0,
                visitor.getCountryCode(),
                visitor.getCountry(),
                visitor.getCity(),
                visitor.getBrowserName(),
                visitor.getOsName(),
                visitor.getDeviceType()
        );

        LiveConnectRepDto repDto = null;
        if (rep != null) {
            User user = rep.getUser();
            repDto = new LiveConnectRepDto(
                    rep.getId(),
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    rep.getAvailability().name(),
                    rep.getPresence().name(),
                    rep.getCreatedAt()
            );
        }

        return new LiveConnectConversationDto(
                conversation.getId(),
                visitorDto,
                repDto,
                conversation.getType().name(),
                conversation.getStatus().name(),
                conversation.getCallDurationSeconds(),
                conversation.getStartedAt(),
                conversation.getEndedAt(),
                messageCount
        );
    }

    /**
     * Builds a display name for a user.
     *
     * @param user the user entity
     * @return display name based on first/last name with username fallback
     */
    private String getUserDisplayName(User user) {
        if (user == null) {
            return "Rep";
        }
        String firstName = user.getFirstName();
        String lastName = user.getLastName();
        if (firstName != null && !firstName.isBlank() && lastName != null && !lastName.isBlank()) {
            return firstName + " " + lastName;
        }
        if (firstName != null && !firstName.isBlank()) {
            return firstName;
        }
        if (lastName != null && !lastName.isBlank()) {
            return lastName;
        }
        String username = user.getUsername();
        if (username != null && !username.isBlank()) {
            return username;
        }
        return "Rep";
    }

    private LiveConnectMessageDto toMessageDto(LiveConnectMessage message, LiveConnectConversation conversation) {
        String senderName;
        if (message.getSenderType() == MessageSenderType.REP) {
            LiveConnectRep rep = conversation.getRep();
            senderName = rep != null ? getUserDisplayName(rep.getUser()) : "Rep";
        } else if (message.getSenderType() == MessageSenderType.USER) {
            LiveConnectVisitor visitor = conversation.getVisitor();
            senderName = visitor.getName() != null ? visitor.getName() : "Visitor";
        } else {
            senderName = "System";
        }

        return new LiveConnectMessageDto(
                message.getId(),
                message.getSenderType().name(),
                message.getSenderId(),
                senderName,
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
