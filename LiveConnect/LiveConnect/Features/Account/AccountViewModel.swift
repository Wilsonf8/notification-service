//
//  AccountViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// View model for the account sheet.
@MainActor
@Observable
final class AccountViewModel {
    /// The current user.
    var currentUser: User? {
        AuthManager.shared.currentUser
    }

    /// Whether a profile update is in progress.
    var isProfileSaving = false

    /// Error from profile update operations.
    var profileError: String?

    /// Whether the edit profile sheet should be shown.
    var showEditProfile = false

    /// Whether a deletion-related operation is in progress.
    var isDeletionLoading = false

    /// Error from deletion operations.
    var deletionError: String?

    /// Preflight response after checking deletion eligibility.
    var preflightResponse: DeletionPreflightResponse?

    /// Whether the deletion confirmation view should be shown.
    var showDeletionConfirmation = false

    /// Whether the blocker alert should be shown.
    var showBlockerAlert = false

    /// Signs out the current user.
    func signOut() {
        AuthManager.shared.signOut()
    }

    /// Updates the user's profile (first name, last name).
    /// - Parameters:
    ///   - firstName: The new first name (or nil to clear).
    ///   - lastName: The new last name (or nil to clear).
    func updateProfile(firstName: String?, lastName: String?) async {
        isProfileSaving = true
        profileError = nil

        do {
            let request = UpdateProfileRequest(
                firstName: firstName?.trimmingCharacters(in: .whitespaces),
                lastName: lastName?.trimmingCharacters(in: .whitespaces)
            )
            let updated: User = try await APIClient.shared.put(
                Endpoints.updateProfile,
                body: request
            )
            AuthManager.shared.updateCurrentUser(updated)
            showEditProfile = false
        } catch {
            profileError = error.localizedDescription
        }

        isProfileSaving = false
    }

    /// Checks whether the account can be deleted.
    /// Shows blockers alert if blocked, or confirmation dialog if eligible.
    func checkDeletionEligibility() async {
        isDeletionLoading = true
        deletionError = nil

        do {
            let response: DeletionPreflightResponse = try await APIClient.shared.get(
                Endpoints.deletionPreflight
            )
            preflightResponse = response

            if response.canDelete {
                showDeletionConfirmation = true
            } else {
                showBlockerAlert = true
            }
        } catch {
            deletionError = error.localizedDescription
        }

        isDeletionLoading = false
    }

    /// Permanently deletes the account (soft-delete with 30-day grace period).
    func deleteAccount() async {
        isDeletionLoading = true
        deletionError = nil

        do {
            try await APIClient.shared.delete(Endpoints.deleteAccount)

            // Clear all local state
            Task {
                await PushNotificationManager.shared.unregisterToken()
            }
            KeychainService.shared.clearAll()
            URLCache.shared.removeAllCachedResponses()
            AuthManager.shared.clearCurrentUser()
        } catch {
            deletionError = error.localizedDescription
        }

        isDeletionLoading = false
    }

    /// Reactivates a soft-deleted account.
    func reactivateAccount() async -> Bool {
        isDeletionLoading = true
        deletionError = nil

        do {
            try await APIClient.shared.post(Endpoints.reactivateAccount, body: Optional<String>.none)
            isDeletionLoading = false
            return true
        } catch {
            deletionError = error.localizedDescription
            isDeletionLoading = false
            return false
        }
    }
}

/// Request body for updating user profile.
struct UpdateProfileRequest: Encodable {
    let firstName: String?
    let lastName: String?
}
