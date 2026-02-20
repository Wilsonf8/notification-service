package com.notificationservice.dto;

/**
 * Request DTO for updating notification preferences.
 *
 * @param notifyVisitorPresence whether to receive visitor presence notifications
 * @param notifyVisitorRequest whether to receive visitor request notifications
 * @param notifyContactForm whether to receive contact form submission notifications
 */
public record UpdateNotificationPreferencesRequest(
        Boolean notifyVisitorPresence,
        Boolean notifyVisitorRequest,
        Boolean notifyContactForm
) {}
