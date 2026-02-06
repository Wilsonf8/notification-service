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
    let email: String?
    let avatarUrl: String?
}
