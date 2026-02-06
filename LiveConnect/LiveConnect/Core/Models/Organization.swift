//
//  Organization.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents an organization that contains projects.
struct Organization: Codable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let slug: String
    let isPersonal: Bool
    let userRole: OrganizationRole
}

/// The role a user has within an organization.
enum OrganizationRole: String, Codable, Sendable {
    case owner = "OWNER"
    case admin = "ADMIN"
    case member = "MEMBER"
}
