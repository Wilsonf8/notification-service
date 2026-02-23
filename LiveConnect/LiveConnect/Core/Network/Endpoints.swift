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
    /// - Returns: Endpoint path.
    static func pingVisitor(projectId: UUID, visitorId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/visitors/\(visitorId)/ping"
    }

    /// Accept a request.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - requestId: The request UUID.
    /// - Returns: Endpoint path.
    static func acceptRequest(projectId: UUID, requestId: UUID) -> String {
        "/api/projects/\(projectId)/liveconnect/requests/\(requestId)/accept"
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
