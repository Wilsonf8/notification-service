//
//  Endpoints.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// API endpoint definitions for the LiveConnect backend.
enum Endpoints {
    /// Base URL for the API.
    static let baseURL = "https://notification-service-production-8875.up.railway.app"

    // MARK: - Auth

    /// Initiate GitHub OAuth flow.
    static let githubOAuth = "/oauth2/authorization/github"

    /// Initiate Google OAuth flow.
    static let googleOAuth = "/oauth2/authorization/google"

    /// Get current authenticated user.
    static let authMe = "/api/auth/me"

    /// Exchange Apple identity token for backend JWT.
    static let appleToken = "/api/auth/apple/token"

    // MARK: - Organizations

    /// List user's organizations.
    static let organizations = "/api/organizations"

    /// List projects in an organization.
    /// - Parameter slug: The organization slug.
    /// - Returns: Endpoint path.
    static func organizationProjects(slug: String) -> String {
        "/api/organizations/\(slug)/projects"
    }

    // MARK: - Projects

    /// Get project details.
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func project(projectId: UUID) -> String {
        "/api/projects/\(projectId)"
    }

    // MARK: - LiveConnect Dashboard

    /// Get visitors (browsing, queue, in call).
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func visitors(projectId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/visitors"
    }

    /// Get reps for a project.
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func reps(projectId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/reps"
    }

    /// Toggle rep availability.
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func availability(projectId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/availability"
    }

    /// Ping a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    ///   - deviceSessionId: The device session ID of the pinging client (optional).
    /// - Returns: Endpoint path.
    static func pingVisitor(projectId: UUID, visitorId: UUID, deviceSessionId: String? = nil) -> String {
        let base = "/api/projects/\(projectId)/liveconnect/visitors/\(visitorId)/ping"
        if let deviceSessionId {
            return "\(base)?deviceSessionId=\(deviceSessionId)"
        }
        return base
    }

    /// Accept a request.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - requestId: The request UUID.
    ///   - deviceSessionId: The device session ID of the accepting client (optional).
    /// - Returns: Endpoint path.
    static func acceptRequest(projectId: UUID, requestId: UUID, deviceSessionId: String? = nil) -> String {
        let base = "/api/projects/\(projectId)/liveconnect/requests/\(requestId)/accept"
        if let deviceSessionId {
            return "\(base)?deviceSessionId=\(deviceSessionId)"
        }
        return base
    }

    /// Dismiss a request.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - requestId: The request UUID.
    /// - Returns: Endpoint path.
    static func dismissRequest(projectId: UUID, requestId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/requests/\(requestId)/dismiss"
    }

    // MARK: - Conversations

    /// List conversations for a project.
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func conversations(projectId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/conversations"
    }

    /// Get a specific conversation.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - conversationId: The conversation UUID.
    /// - Returns: Endpoint path.
    static func conversation(projectId: UUID, conversationId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/conversations/\(conversationId)"
    }

    /// Get messages for a conversation.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - conversationId: The conversation UUID.
    /// - Returns: Endpoint path.
    static func messages(projectId: UUID, conversationId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/conversations/\(conversationId)/messages"
    }

    /// Send a message in a conversation.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - conversationId: The conversation UUID.
    /// - Returns: Endpoint path.
    static func sendMessage(projectId: UUID, conversationId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/conversations/\(conversationId)/messages"
    }

    /// End a conversation.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - conversationId: The conversation UUID.
    /// - Returns: Endpoint path.
    static func endConversation(projectId: UUID, conversationId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/conversations/\(conversationId)/end"
    }

    // MARK: - Visitor Visits

    /// Endpoint for fetching visitor visit history and statistics.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    ///   - page: Page number (0-indexed).
    ///   - size: Page size.
    /// - Returns: The URL path string.
    static func visitorVisits(projectId: UUID, visitorId: UUID, page: Int = 0, size: Int = 20) -> String {
        "/api/projects/\(projectId)/liveconnect/visitors/\(visitorId)/visits?page=\(page)&size=\(size)"
    }

    // MARK: - CRM

    /// List CRM visitors for a project.
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func crmVisitors(projectId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors"
    }

    /// Get CRM visitor detail.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmVisitorDetail(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)"
    }

    /// Update a visitor's contact information.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmUpdateVisitorContact(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/contact"
    }

    /// Update a visitor's pipeline stage.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmUpdateStage(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/stage"
    }

    /// Assign or unassign a rep to a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmAssignRep(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/assign"
    }

    /// List all CRM tags for a project.
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func crmTags(projectId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/tags"
    }

    /// Get or update a specific CRM tag.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - tagId: The tag UUID.
    /// - Returns: Endpoint path.
    static func crmTag(projectId: UUID, tagId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/tags/\(tagId)"
    }

    /// Manage tags on a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmVisitorTags(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/tags"
    }

    /// Remove a specific tag from a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    ///   - tagId: The tag UUID.
    /// - Returns: Endpoint path.
    static func crmVisitorTag(projectId: UUID, visitorId: UUID, tagId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/tags/\(tagId)"
    }

    /// List notes for a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmVisitorNotes(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/notes"
    }

    /// Delete a specific note from a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    ///   - noteId: The note UUID.
    /// - Returns: Endpoint path.
    static func crmVisitorNote(projectId: UUID, visitorId: UUID, noteId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/notes/\(noteId)"
    }

    /// Get unified timeline for a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmVisitorTimeline(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/timeline"
    }

    /// List conversations for a CRM visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func crmVisitorConversations(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/crm/visitors/\(visitorId)/conversations"
    }

    // MARK: - WebSocket

    /// WebSocket URL for real-time dashboard updates.
    /// - Parameter projectId: The project UUID.
    /// - Returns: WebSocket URL string.
    static func webSocket(projectId: UUID) -> String {
        let wsBase = baseURL.replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        return "\(wsBase)/api/projects/\(projectId)/liveconnect/ws"
    }

    // MARK: - Moderation

    /// Report a visitor or their message.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func reportVisitor(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/visitors/\(visitorId)/report"
    }

    /// Block a visitor.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    /// - Returns: Endpoint path.
    static func blockVisitor(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/visitors/\(visitorId)/block"
    }

    // MARK: - Account Deletion

    /// Preflight check before account deletion.
    static let deletionPreflight = "/api/users/me/deletion-preflight"

    /// Delete current user account (soft-delete with 30-day grace period).
    static let deleteAccount = "/api/users/me"

    /// Reactivate a soft-deleted account.
    static let reactivateAccount = "/api/users/me/reactivate"

    // MARK: - Organization Management

    /// Get or update a specific organization.
    /// - Parameter slug: The organization slug.
    /// - Returns: Endpoint path.
    static func organization(slug: String) -> String {
        "/api/organizations/\(slug)"
    }

    /// Get tier limits for an organization.
    /// - Parameter slug: The organization slug.
    /// - Returns: Endpoint path.
    static func organizationTier(slug: String) -> String {
        "/api/organizations/\(slug)/tier"
    }

    // MARK: - Organization Members

    /// List members of an organization.
    /// - Parameter slug: The organization slug.
    /// - Returns: Endpoint path.
    static func organizationMembers(slug: String) -> String {
        "/api/organizations/\(slug)/members"
    }

    /// Update or remove a specific organization member.
    /// - Parameters:
    ///   - slug: The organization slug.
    ///   - memberId: The member UUID.
    /// - Returns: Endpoint path.
    static func organizationMember(slug: String, memberId: UUID) -> String {
        "/api/organizations/\(slug)/members/\(memberId)"
    }

    /// Update a member's role in the organization.
    /// - Parameters:
    ///   - slug: The organization slug.
    ///   - memberId: The member UUID.
    /// - Returns: Endpoint path.
    static func organizationMemberRole(slug: String, memberId: UUID) -> String {
        "/api/organizations/\(slug)/members/\(memberId)/role"
    }

    /// Leave an organization.
    /// - Parameter slug: The organization slug.
    /// - Returns: Endpoint path.
    static func organizationLeave(slug: String) -> String {
        "/api/organizations/\(slug)/leave"
    }

    /// Transfer ownership of an organization.
    /// - Parameter slug: The organization slug.
    /// - Returns: Endpoint path.
    static func organizationTransferOwnership(slug: String) -> String {
        "/api/organizations/\(slug)/transfer-ownership"
    }

    // MARK: - Organization Invitations

    /// List or create invitations for an organization.
    /// - Parameter slug: The organization slug.
    /// - Returns: Endpoint path.
    static func organizationInvitations(slug: String) -> String {
        "/api/organizations/\(slug)/invitations"
    }

    /// Revoke a specific invitation.
    /// - Parameters:
    ///   - slug: The organization slug.
    ///   - invitationId: The invitation UUID.
    /// - Returns: Endpoint path.
    static func organizationInvitation(slug: String, invitationId: UUID) -> String {
        "/api/organizations/\(slug)/invitations/\(invitationId)"
    }

    // MARK: - User Invitations

    /// Get pending invitations for the current user.
    static let pendingInvitations = "/api/invitations/pending"

    /// Get count of pending invitations for the current user.
    static let pendingInvitationsCount = "/api/invitations/pending/count"

    /// Accept a pending invitation.
    /// - Parameter invitationId: The invitation UUID.
    /// - Returns: Endpoint path.
    static func acceptInvitation(invitationId: UUID) -> String {
        "/api/invitations/\(invitationId)/accept"
    }

    /// Decline a pending invitation.
    /// - Parameter invitationId: The invitation UUID.
    /// - Returns: Endpoint path.
    static func declineInvitation(invitationId: UUID) -> String {
        "/api/invitations/\(invitationId)/decline"
    }

    // MARK: - User Search

    /// Search for users to invite to an organization.
    /// - Parameters:
    ///   - query: The search query string.
    ///   - excludeOrgId: Organization UUID to exclude current members from results.
    /// - Returns: Endpoint path.
    static func userSearch(query: String, excludeOrgId: UUID) -> String {
        let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        return "/api/users/search?query=\(encodedQuery)&excludeOrgId=\(excludeOrgId)"
    }

    // MARK: - Device Tokens

    /// Register or unregister device tokens for push notifications.
    static let deviceTokens = "/api/device-tokens"

    // MARK: - Notification Preferences

    /// Get or update notification preferences for a project.
    /// - Parameter projectId: The project UUID.
    /// - Returns: Endpoint path.
    static func notificationPreferences(projectId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/notification-preferences"
    }
}
