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

    /// Display name with priority: firstName+lastName → firstName → lastName → username → email → "User".
    var displayName: String {
        let first = firstName?.trimmingCharacters(in: .whitespaces)
        let last = lastName?.trimmingCharacters(in: .whitespaces)
        if let first, !first.isEmpty, let last, !last.isEmpty {
            return "\(first) \(last)"
        }
        if let first, !first.isEmpty { return first }
        if let last, !last.isEmpty { return last }
        if !username.isEmpty { return username }
        if let email, !email.isEmpty { return email }
        return "User"
    }
}
