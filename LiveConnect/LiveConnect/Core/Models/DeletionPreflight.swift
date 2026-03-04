//
//  DeletionPreflight.swift
//  LiveConnect
//
//  Created by Claude on 3/3/26.
//

import Foundation

/// Response from the account deletion preflight check.
struct DeletionPreflightResponse: Codable, Sendable {
    /// Whether the account can be deleted.
    let canDelete: Bool

    /// Organizations that block deletion (user must transfer ownership first).
    let blockers: [DeletionBlocker]
}

/// An organization that blocks account deletion.
struct DeletionBlocker: Codable, Sendable, Identifiable {
    let id: UUID
    let name: String
    let slug: String
}
