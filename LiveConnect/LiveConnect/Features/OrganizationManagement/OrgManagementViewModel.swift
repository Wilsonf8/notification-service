//
//  OrgManagementViewModel.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import Foundation

/// View model for the organization management screen.
@MainActor
@Observable
final class OrgManagementViewModel {
    /// The organization being managed.
    let organization: Organization

    /// Tier limits for the organization.
    private(set) var tierLimits: TierLimits?

    /// Whether tier limits are loading.
    private(set) var isLoading = false

    /// The last error that occurred.
    private(set) var error: Error?

    /// The edited organization name.
    var editedName: String = ""

    /// Whether the name is being saved.
    private(set) var isSaving = false

    /// Whether the organization is being deleted.
    private(set) var isDeleting = false

    /// Whether to show the delete confirmation alert.
    var showDeleteConfirmation = false

    /// Whether the name was successfully saved (for brief feedback).
    var nameSaved = false

    /// Initializes the view model with an organization.
    /// - Parameter organization: The organization to manage.
    init(organization: Organization) {
        self.organization = organization
        self.editedName = organization.name
    }

    // MARK: - API Methods

    /// Loads tier limits for the organization.
    func loadTierLimits() async {
        isLoading = true
        error = nil

        do {
            tierLimits = try await APIClient.shared.get(
                Endpoints.organizationTier(slug: organization.slug)
            )
        } catch {
            self.error = error
            print("OrgManagementViewModel: Failed to load tier limits: \(error)")
        }

        isLoading = false
    }

    /// Updates the organization name.
    /// - Throws: API error if the update fails.
    func updateName() async throws {
        guard !editedName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        isSaving = true
        defer { isSaving = false }

        let request = UpdateOrganizationRequest(name: editedName.trimmingCharacters(in: .whitespacesAndNewlines))
        let _: Organization = try await APIClient.shared.put(
            Endpoints.organization(slug: organization.slug),
            body: request
        )
        nameSaved = true

        // Reset feedback after a delay
        Task {
            try? await Task.sleep(for: .seconds(2))
            nameSaved = false
        }
    }

    /// Deletes the organization.
    /// - Throws: API error if the deletion fails.
    func deleteOrganization() async throws {
        isDeleting = true
        defer { isDeleting = false }

        try await APIClient.shared.delete(
            Endpoints.organization(slug: organization.slug)
        )
    }
}
