//
//  Conversation.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents a conversation between a visitor and rep.
struct Conversation: Codable, Identifiable, Sendable {
    let id: UUID
    let visitor: Visitor
    let rep: Rep?
    let type: ConversationType
    let status: ConversationStatus
    let callDurationSeconds: Int?
    let startedAt: Date
    let endedAt: Date?
    let messageCount: Int

    /// Formatted duration string (e.g., "5:32").
    var formattedDuration: String? {
        guard let seconds = callDurationSeconds else { return nil }
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        return String(format: "%d:%02d", minutes, remainingSeconds)
    }
}

/// The type of conversation.
enum ConversationType: String, Codable, Sendable {
    case videoCall = "VIDEO_CALL"
    case contactForm = "CONTACT_FORM"
}

/// The status of a conversation.
enum ConversationStatus: String, Codable, Sendable {
    case active = "ACTIVE"
    case ended = "ENDED"
}
