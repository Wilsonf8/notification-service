//
//  InvitationService.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import Foundation

/// Global singleton service for tracking and managing user invitation state.
@MainActor
@Observable
final class InvitationService {
    /// Shared singleton instance.
    static let shared = InvitationService()

    /// The number of pending invitations for the current user.
    private(set) var pendingCount: Int = 0

    /// Whether the service is currently loading.
    private(set) var isLoading = false

    /// Background polling task.
    private var pollingTask: Task<Void, Never>?

    private init() {}

    // MARK: - Polling

    /// Starts polling for pending invitation count at the given interval.
    /// - Parameter interval: Polling interval in seconds. Defaults to 60.
    func startPolling(interval: TimeInterval = 60) {
        stopPolling()
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.fetchPendingCount()
                try? await Task.sleep(for: .seconds(interval))
            }
        }
    }

    /// Stops the polling task.
    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    /// Resets state on sign-out.
    func reset() {
        stopPolling()
        pendingCount = 0
    }

    // MARK: - API Methods

    /// Fetches the current pending invitation count from the server.
    func fetchPendingCount() async {
        do {
            let response: InvitationCountResponse = try await APIClient.shared.get(
                Endpoints.pendingInvitationsCount
            )
            pendingCount = response.count
        } catch {
            print("InvitationService: Failed to fetch pending count: \(error)")
        }
    }

    /// Fetches all pending invitations for the current user.
    /// - Returns: Array of pending invitations.
    func fetchPendingInvitations() async throws -> [OrganizationInvitation] {
        try await APIClient.shared.get(Endpoints.pendingInvitations)
    }

    /// Accepts a pending invitation.
    /// - Parameter invitationId: The invitation to accept.
    func acceptInvitation(_ invitationId: UUID) async throws {
        let _: OrganizationInvitation = try await APIClient.shared.post(
            Endpoints.acceptInvitation(invitationId: invitationId)
        )
        await fetchPendingCount()
    }

    /// Declines a pending invitation.
    /// - Parameter invitationId: The invitation to decline.
    func declineInvitation(_ invitationId: UUID) async throws {
        let _: OrganizationInvitation = try await APIClient.shared.post(
            Endpoints.declineInvitation(invitationId: invitationId)
        )
        await fetchPendingCount()
    }
}
