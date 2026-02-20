package com.notificationservice.service;

import com.notificationservice.dto.ContactFormRequest;
import com.notificationservice.entity.ConversationStatus;
import com.notificationservice.entity.ConversationType;
import com.notificationservice.entity.LiveConnectConversation;
import com.notificationservice.entity.LiveConnectMessage;
import com.notificationservice.entity.LiveConnectSession;
import com.notificationservice.entity.LiveConnectVisitor;
import com.notificationservice.entity.MessageSenderType;
import com.notificationservice.repository.LiveConnectConversationRepository;
import com.notificationservice.repository.LiveConnectMessageRepository;
import com.notificationservice.repository.LiveConnectVisitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Service for handling contact form submissions when reps are offline.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveConnectContactService {

    private final LiveConnectConversationRepository conversationRepository;
    private final LiveConnectMessageRepository messageRepository;
    private final LiveConnectVisitorRepository visitorRepository;
    private final PushNotificationService pushNotificationService;

    /**
     * Submits a contact form when reps are offline.
     * Creates a CONTACT_FORM conversation with the visitor's message.
     *
     * @param session the visitor's session
     * @param request the contact form data
     */
    @Transactional
    public void submitContactForm(LiveConnectSession session, ContactFormRequest request) {
        LiveConnectVisitor visitor = session.getVisitor();

        // Update visitor info with form data
        visitor.setName(request.name());
        visitor.setEmail(request.email());
        visitorRepository.save(visitor);

        // Create a contact form "conversation" (no rep, immediately ended)
        LiveConnectConversation conversation = LiveConnectConversation.builder()
                .project(session.getProject())
                .visitor(visitor)
                .rep(null)
                .type(ConversationType.CONTACT_FORM)
                .status(ConversationStatus.ENDED)
                .endedAt(OffsetDateTime.now())
                .build();
        conversation = conversationRepository.save(conversation);

        // Build message content including all form fields
        StringBuilder messageContent = new StringBuilder();
        messageContent.append("Name: ").append(request.name()).append("\n");
        messageContent.append("Email: ").append(request.email()).append("\n");
        if (request.phone() != null && !request.phone().isBlank()) {
            messageContent.append("Phone: ").append(request.phone()).append("\n");
        }
        messageContent.append("\nMessage:\n").append(request.message());

        // Store the message
        LiveConnectMessage message = LiveConnectMessage.builder()
                .conversation(conversation)
                .senderType(MessageSenderType.USER)
                .senderId(visitor.getId())
                .content(messageContent.toString())
                .build();
        messageRepository.save(message);

        // Send push notification to all reps
        pushNotificationService.sendContactFormNotification(
                session.getProject().getId(),
                request.name(),
                request.message(),
                conversation.getId(),
                session.getProject().getName()
        );

        log.info("Contact form submitted for project {} by visitor {}",
                session.getProject().getId(), visitor.getVisitorId());
    }
}
