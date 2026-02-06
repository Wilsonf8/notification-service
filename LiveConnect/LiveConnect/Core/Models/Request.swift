//
//  Request.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents a call request from a visitor or rep.
struct Request: Codable, Identifiable, Sendable {
    let id: UUID
    let visitor: Visitor
    let direction: RequestDirection
    let status: RequestStatus
    let expiresAt: Date
}

/// The direction of a call request.
enum RequestDirection: String, Codable, Sendable {
    case userToReps = "USER_TO_REPS"
    case repToUser = "REP_TO_USER"
}

/// The status of a call request.
enum RequestStatus: String, Codable, Sendable {
    case pending = "PENDING"
    case accepted = "ACCEPTED"
    case rejected = "REJECTED"
    case expired = "EXPIRED"
    case cancelled = "CANCELLED"
}
