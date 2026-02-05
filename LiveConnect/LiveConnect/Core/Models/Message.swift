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

    enum CodingKeys: String, CodingKey {
        case id
        case senderType = "sender_type"
        case senderName = "sender_name"
        case content
        case createdAt = "created_at"
    }
}

/// The type of message sender.
enum MessageSenderType: String, Codable, Sendable {
    case user = "USER"
    case rep = "REP"
    case system = "SYSTEM"
}
