//
//  OrganizationModels.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import Foundation

// MARK: - Organization Member

/// A member of an organization with their role and profile information.
struct OrganizationMember: Codable, Identifiable, Sendable {
    let id: UUID
    let userId: UUID
    let username: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let avatarUrl: String?
    let role: OrganizationRole
    let joinedAt: Date

    /// Display name using first + last name, falling back to username.
    var displayName: String {
        if let first = firstName, let last = lastName, !first.isEmpty {
            return "\(first) \(last)"
        }
        return username
    }
}

// MARK: - Organization Invitation

/// An invitation to join an organization.
struct OrganizationInvitation: Codable, Identifiable, Sendable {
    let id: UUID
    let organizationId: UUID
    let organizationName: String
    let organizationSlug: String
    let inviterId: UUID
    let inviterUsername: String
    let inviteeId: UUID
    let inviteeUsername: String
    let inviteeFirstName: String?
    let inviteeLastName: String?
    let inviteeEmail: String?
    let inviteeAvatarUrl: String?
    let role: OrganizationRole
    let status: InvitationStatus
    let createdAt: Date

    /// Display name for the invitee.
    var inviteeDisplayName: String {
        if let first = inviteeFirstName, let last = inviteeLastName, !first.isEmpty {
            return "\(first) \(last)"
        }
        return inviteeUsername
    }
}

/// The status of an invitation.
enum InvitationStatus: String, Codable, Sendable {
    case pending = "PENDING"
    case accepted = "ACCEPTED"
    case declined = "DECLINED"
    case revoked = "REVOKED"
}

// MARK: - Tier Limits

/// Tier limits and current usage for an organization.
struct TierLimits: Codable, Sendable {
    let tier: String
    let maxProjects: Int
    let currentProjects: Int
    let maxMembers: Int
    let currentMembers: Int
    let maxRepsPerProject: Int
    let maxEmbedKeysPerProject: Int
    let widgetCustomizationEnabled: Bool
    let invitationsEnabled: Bool
    let orgActive: Bool
}

// MARK: - User Search

/// A user search result for inviting members.
struct UserSearchResult: Codable, Identifiable, Sendable {
    let id: UUID
    let username: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let avatarUrl: String?

    /// Display name using first + last name, falling back to username.
    var displayName: String {
        if let first = firstName, let last = lastName, !first.isEmpty {
            return "\(first) \(last)"
        }
        return username
    }
}

// MARK: - Request Bodies

/// Request body for creating an organization.
struct CreateOrganizationRequest: Encodable {
    let name: String
}

/// Request body for updating an organization.
struct UpdateOrganizationRequest: Encodable {
    let name: String
}

/// Request body for creating an invitation.
struct CreateInvitationRequest: Encodable {
    let userId: UUID
    let role: String
}

/// Request body for updating a member's role.
struct UpdateMemberRoleRequest: Encodable {
    let role: String
}

/// Request body for transferring ownership.
struct TransferOwnershipRequest: Encodable {
    let memberId: UUID
}

/// Request body for creating a project.
struct CreateProjectRequest: Encodable {
    let name: String
    let type: String
}

// MARK: - Response Wrappers

/// Response for invitation count endpoint.
struct InvitationCountResponse: Codable {
    let count: Int
}
