//
//  Message.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents a chat message within a conversation.
struct Message: Codable, Identifiable, Sendable {
    let id: UUID
    let senderType: MessageSenderType
    let senderName: String?
    let content: String
    let createdAt: Date
}

/// The type of message sender.
enum MessageSenderType: String, Codable, Sendable {
    case user = "USER"
    case rep = "REP"
    case system = "SYSTEM"
}
