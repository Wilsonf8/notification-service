//
//  User.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents an authenticated user in the system.
struct User: Codable, Identifiable, Sendable {
    let id: UUID
    let username: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let avatarUrl: String?

    /// Full name if available, otherwise falls back to username.
    var displayName: String {
        if let first = firstName, let last = lastName {
            return "\(first) \(last)"
        }
        return username
    }
}
