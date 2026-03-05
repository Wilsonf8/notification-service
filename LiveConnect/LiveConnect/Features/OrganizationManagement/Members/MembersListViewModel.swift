//
//  MembersListViewModel.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import Foundation

/// View model for the members list screen.
@MainActor
@Observable
final class MembersListViewModel {
    /// The organization whose members are being managed.
    let organization: Organization

    /// The list of organization members.
    private(set) var members: [OrganizationMember] = []

    /// Whether members are loading.
    private(set) var isLoading = false

    /// The last error that occurred.
    private(set) var error: Error?

    /// Whether a member action is in progress.
    private(set) var isProcessing = false

    /// Initializes the view model with an organization.
    /// - Parameter organization: The organization to manage members for.
    init(organization: Organization) {
        self.organization = organization
    }

    // MARK: - API Methods

    /// Loads all members of the organization.
    func loadMembers() async {
        isLoading = true
        error = nil

        do {
            members = try await APIClient.shared.get(
                Endpoints.organizationMembers(slug: organization.slug)
            )
            // Sort: owners first, then admins, then members, alphabetically within each group
            members.sort { lhs, rhs in
                if lhs.role != rhs.role {
                    return lhs.role.sortOrder < rhs.role.sortOrder
                }
                return lhs.displayName.localizedCaseInsensitiveCompare(rhs.displayName) == .orderedAscending
            }
        } catch {
            self.error = error
            print("MembersListViewModel: Failed to load members: \(error)")
        }

        isLoading = false
    }

    /// Removes a member from the organization.
    /// - Parameter memberId: The member UUID to remove.
    func removeMember(_ memberId: UUID) async throws {
        isProcessing = true
        defer { isProcessing = false }

        try await APIClient.shared.delete(
            Endpoints.organizationMember(slug: organization.slug, memberId: memberId)
        )
        members.removeAll { $0.id == memberId }
    }

    /// Updates a member's role.
    /// - Parameters:
    ///   - memberId: The member UUID.
    ///   - role: The new role.
    func updateRole(_ memberId: UUID, role: OrganizationRole) async throws {
        isProcessing = true
        defer { isProcessing = false }

        let request = UpdateMemberRoleRequest(role: role.rawValue)
        let _: OrganizationMember = try await APIClient.shared.put(
            Endpoints.organizationMemberRole(slug: organization.slug, memberId: memberId),
            body: request
        )

        // Update local state
        if let index = members.firstIndex(where: { $0.id == memberId }) {
            await loadMembers()
            _ = index // suppress unused warning
        }
    }

    /// Leaves the organization.
    func leaveOrganization() async throws {
        isProcessing = true
        defer { isProcessing = false }

        let _: EmptyResponse = try await APIClient.shared.post(
            Endpoints.organizationLeave(slug: organization.slug)
        )
    }

    /// Transfers ownership to another member.
    /// - Parameter memberId: The member UUID to transfer ownership to.
    func transferOwnership(to memberId: UUID) async throws {
        isProcessing = true
        defer { isProcessing = false }

        let request = TransferOwnershipRequest(memberId: memberId)
        let _: EmptyResponse = try await APIClient.shared.post(
            Endpoints.organizationTransferOwnership(slug: organization.slug),
            body: request
        )
        await loadMembers()
    }
}

// MARK: - EmptyResponse

/// Empty response for endpoints that return no body.
struct EmptyResponse: Codable {}

// MARK: - OrganizationRole Sort Order

extension OrganizationRole {
    /// Sort order for displaying members (owner first).
    var sortOrder: Int {
        switch self {
        case .owner: return 0
        case .admin: return 1
        case .member: return 2
        }
    }
}
