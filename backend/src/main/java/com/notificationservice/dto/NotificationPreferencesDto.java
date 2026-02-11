package com.notificationservice.dto;

/**
 * DTO for rep notification preferences.
 *
 * @param notifyVisitorPresence whether to receive visitor presence notifications
 * @param notifyVisitorRequest whether to receive visitor request notifications
 */
public record NotificationPreferencesDto(
        boolean notifyVisitorPresence,
        boolean notifyVisitorRequest
) {}
