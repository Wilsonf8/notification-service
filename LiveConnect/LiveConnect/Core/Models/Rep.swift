//
//  Rep.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents a representative who can handle LiveConnect calls.
struct Rep: Codable, Identifiable, Sendable {
    let id: UUID
    let userId: UUID
    let name: String
    let email: String
    let availability: RepAvailability
    let presence: RepPresence

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case email
        case availability
        case presence
    }
}

/// The availability status of a rep.
enum RepAvailability: String, Codable, Sendable {
    case available = "AVAILABLE"
    case unavailable = "UNAVAILABLE"
}

/// The presence status of a rep.
enum RepPresence: String, Codable, Sendable {
    case online = "ONLINE"
    case offline = "OFFLINE"
    case inCall = "IN_CALL"
}
