//
//  NotificationPreferences.swift
//  LiveConnect
//
//  Created by Claude on 2/10/26.
//

import Foundation

/// Notification preferences for a rep.
struct NotificationPreferences: Codable, Sendable {
    /// Whether to receive notifications when visitors arrive.
    var notifyVisitorPresence: Bool

    /// Whether to receive notifications when visitors request calls.
    var notifyVisitorRequest: Bool

    /// Whether to receive notifications when contact forms are submitted.
    var notifyContactForm: Bool

    init(notifyVisitorPresence: Bool = true, notifyVisitorRequest: Bool = true, notifyContactForm: Bool = true) {
        self.notifyVisitorPresence = notifyVisitorPresence
        self.notifyVisitorRequest = notifyVisitorRequest
        self.notifyContactForm = notifyContactForm
    }
}

/// Request body for updating notification preferences.
struct UpdateNotificationPreferencesRequest: Encodable {
    let notifyVisitorPresence: Bool?
    let notifyVisitorRequest: Bool?
    let notifyContactForm: Bool?
}
