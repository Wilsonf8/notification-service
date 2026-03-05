//
//  InviteMemberView.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// View for searching and inviting users to an organization.
struct InviteMemberView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: InviteMemberViewModel

    /// Callback when an invitation is sent.
    var onInviteSent: (() async -> Void)?

    /// Initializes the view with an organization.
    /// - Parameters:
    ///   - organization: The organization to invite members to.
    ///   - onInviteSent: Callback when an invitation is sent.
    init(organization: Organization, onInviteSent: (() async -> Void)? = nil) {
        self._viewModel = State(initialValue: InviteMemberViewModel(organization: organization))
        self.onInviteSent = onInviteSent
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 16) {
                    // Role picker
                    rolePicker

                    // Search field
                    searchField

                    // Status messages
                    if let success = viewModel.successMessage {
                        Text(success)
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    // Results
                    if viewModel.isSearching {
                        ProgressView()
                            .tint(.yellow)
                            .padding()
                    } else if viewModel.searchResults.isEmpty && viewModel.searchQuery.count >= 2 {
                        noResultsView
                    } else {
                        resultsList
                    }

                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Invite Member")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    // MARK: - Role Picker

    private var rolePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("INVITE AS")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            Picker("Role", selection: $viewModel.selectedRole) {
                Text("Admin").tag(OrganizationRole.admin)
                Text("Member").tag(OrganizationRole.member)
            }
            .pickerStyle(.segmented)
        }
    }

    // MARK: - Search Field

    private var searchField: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("Search by name, username, or email", text: $viewModel.searchQuery)
                .textFieldStyle(.plain)
                .foregroundStyle(.white)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .overlay(
            Rectangle()
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Results List

    private var resultsList: some View {
        ScrollView {
            LazyVStack(spacing: 1) {
                ForEach(viewModel.searchResults) { user in
                    UserSearchRow(user: user, isSending: viewModel.isSending) {
                        Task {
                            await viewModel.sendInvitation(userId: user.id)
                            await onInviteSent?()
                        }
                    }
                }
            }
            .background(Color.white.opacity(0.05))
        }
    }

    // MARK: - No Results

    private var noResultsView: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.slash")
                .font(.title)
                .foregroundStyle(.secondary)
            Text("No users found")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 32)
    }
}

// MARK: - UserSearchRow

/// A row displaying a user search result with an invite button.
private struct UserSearchRow: View {
    let user: UserSearchResult
    let isSending: Bool
    let onInvite: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            if let avatarUrl = user.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 36, height: 36)
                            .clipShape(Circle())
                    default:
                        avatarPlaceholder
                    }
                }
            } else {
                avatarPlaceholder
            }

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(user.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)

                Text("@\(user.username)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Invite button
            Button(action: onInvite) {
                Text("Invite")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.black)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.yellow)
            }
            .disabled(isSending)
        }
        .padding()
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Color.yellow.opacity(0.3))
            .frame(width: 36, height: 36)
            .overlay(
                Text(user.displayName.prefix(1).uppercased())
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.yellow)
            )
    }
}

#Preview {
    InviteMemberView(
        organization: Organization(
            id: UUID(),
            name: "My Team",
            slug: "my-team",
            isPersonal: false,
            userRole: .owner
        )
    )
}
