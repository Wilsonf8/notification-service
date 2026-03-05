//
//  OrgInvitationsViewModel.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import Foundation

/// View model for the organization invitations admin screen.
@MainActor
@Observable
final class OrgInvitationsViewModel {
    /// The organization whose invitations are being managed.
    let organization: Organization

    /// Pending invitations for the organization.
    private(set) var invitations: [OrganizationInvitation] = []

    /// Whether invitations are loading.
    private(set) var isLoading = false

    /// The last error that occurred.
    private(set) var error: Error?

    /// Initializes the view model with an organization.
    /// - Parameter organization: The organization to manage invitations for.
    init(organization: Organization) {
        self.organization = organization
    }

    // MARK: - API Methods

    /// Loads pending invitations for the organization.
    func loadInvitations() async {
        isLoading = true
        error = nil

        do {
            invitations = try await APIClient.shared.get(
                Endpoints.organizationInvitations(slug: organization.slug)
            )
        } catch {
            self.error = error
            print("OrgInvitationsViewModel: Failed to load invitations: \(error)")
        }

        isLoading = false
    }

    /// Revokes a pending invitation.
    /// - Parameter invitationId: The invitation UUID to revoke.
    func revokeInvitation(_ invitationId: UUID) async throws {
        try await APIClient.shared.delete(
            Endpoints.organizationInvitation(slug: organization.slug, invitationId: invitationId)
        )
        invitations.removeAll { $0.id == invitationId }
    }
}
