//
//  Visitor.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents a visitor browsing a website with LiveConnect.
struct Visitor: Codable, Identifiable, Sendable {
    let id: UUID
    let visitorId: String
    let name: String?
    let email: String?
    let currentPage: String?
    let isConnected: Bool
    let isPingable: Bool
    let hasActiveRequest: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case visitorId = "visitor_id"
        case name
        case email
        case currentPage = "current_page"
        case isConnected = "is_connected"
        case isPingable = "is_pingable"
        case hasActiveRequest = "has_active_request"
    }

    /// Display name for the visitor, falling back to visitor ID if no name set.
    var displayName: String {
        name ?? "Visitor \(visitorId.prefix(8))"
    }
}
