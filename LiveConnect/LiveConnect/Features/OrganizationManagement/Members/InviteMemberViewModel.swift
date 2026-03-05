//
//  InviteMemberViewModel.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import Foundation

/// View model for the invite member screen.
@MainActor
@Observable
final class InviteMemberViewModel {
    /// The organization to invite members to.
    let organization: Organization

    /// The current search query.
    var searchQuery = "" {
        didSet {
            scheduleSearch()
        }
    }

    /// The selected role for the invitation.
    var selectedRole: OrganizationRole = .member

    /// Search results.
    private(set) var searchResults: [UserSearchResult] = []

    /// Whether a search is in progress.
    private(set) var isSearching = false

    /// Whether an invitation is being sent.
    private(set) var isSending = false

    /// Success message after sending an invitation.
    var successMessage: String?

    /// Error message.
    var errorMessage: String?

    /// Debounce task for search.
    private var searchTask: Task<Void, Never>?

    /// Initializes the view model with an organization.
    /// - Parameter organization: The organization to invite members to.
    init(organization: Organization) {
        self.organization = organization
    }

    // MARK: - Search

    /// Schedules a debounced search.
    private func scheduleSearch() {
        searchTask?.cancel()
        let query = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)

        guard query.count >= 2 else {
            searchResults = []
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await performSearch(query: query)
        }
    }

    /// Performs the user search.
    /// - Parameter query: The search query.
    private func performSearch(query: String) async {
        isSearching = true

        do {
            searchResults = try await APIClient.shared.get(
                Endpoints.userSearch(query: query, excludeOrgId: organization.id)
            )
        } catch {
            if !Task.isCancelled {
                print("InviteMemberViewModel: Search failed: \(error)")
                searchResults = []
            }
        }

        isSearching = false
    }

    // MARK: - Invite

    /// Sends an invitation to a user.
    /// - Parameter userId: The user UUID to invite.
    func sendInvitation(userId: UUID) async {
        isSending = true
        errorMessage = nil
        successMessage = nil

        do {
            let request = CreateInvitationRequest(userId: userId, role: selectedRole.rawValue)
            let _: OrganizationInvitation = try await APIClient.shared.post(
                Endpoints.organizationInvitations(slug: organization.slug),
                body: request
            )
            successMessage = "Invitation sent"

            // Remove from results
            searchResults.removeAll { $0.id == userId }

            // Reset success after delay
            Task {
                try? await Task.sleep(for: .seconds(2))
                successMessage = nil
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isSending = false
    }
}
