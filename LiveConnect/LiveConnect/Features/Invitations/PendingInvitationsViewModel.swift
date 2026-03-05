//
//  PendingInvitationsViewModel.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import Foundation

/// View model for the user's pending invitations screen.
@MainActor
@Observable
final class PendingInvitationsViewModel {
    /// Pending invitations for the current user.
    private(set) var invitations: [OrganizationInvitation] = []

    /// Whether invitations are loading.
    private(set) var isLoading = false

    /// Whether an action is in progress.
    private(set) var isProcessing = false

    /// The last error that occurred.
    private(set) var error: Error?

    // MARK: - API Methods

    /// Loads all pending invitations for the current user.
    func loadInvitations() async {
        isLoading = true
        error = nil

        do {
            invitations = try await InvitationService.shared.fetchPendingInvitations()
        } catch {
            self.error = error
            print("PendingInvitationsViewModel: Failed to load invitations: \(error)")
        }

        isLoading = false
    }

    /// Accepts a pending invitation.
    /// - Parameter invitationId: The invitation UUID to accept.
    func accept(_ invitationId: UUID) async throws {
        isProcessing = true
        defer { isProcessing = false }

        try await InvitationService.shared.acceptInvitation(invitationId)
        invitations.removeAll { $0.id == invitationId }
    }

    /// Declines a pending invitation.
    /// - Parameter invitationId: The invitation UUID to decline.
    func decline(_ invitationId: UUID) async throws {
        isProcessing = true
        defer { isProcessing = false }

        try await InvitationService.shared.declineInvitation(invitationId)
        invitations.removeAll { $0.id == invitationId }
    }
}
