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

    // MARK: - WebSocket

    /// WebSocket URL for real-time dashboard updates.
    /// - Parameter projectId: The project UUID.
    /// - Returns: WebSocket URL string.
    static func webSocket(projectId: UUID) -> String {
        let wsBase = baseURL.replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        return "\(wsBase)/api/projects/\(projectId)/liveconnect/ws"
    }
}
