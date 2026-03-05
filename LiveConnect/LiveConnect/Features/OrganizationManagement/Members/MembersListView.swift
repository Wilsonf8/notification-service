//
//  MembersListView.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// View displaying all members of an organization with management actions.
struct MembersListView: View {
    @State private var viewModel: MembersListViewModel
    @State private var showInviteSheet = false
    @State private var showLeaveConfirmation = false
    @State private var showTransferSheet = false
    @State private var memberToChangeRole: OrganizationMember?
    @State private var memberToRemove: OrganizationMember?
    @State private var showError = false
    @State private var errorMessage = ""

    /// Callback when the organization is modified.
    var onOrganizationChanged: (() async -> Void)?

    /// Initializes the view with an organization.
    /// - Parameters:
    ///   - organization: The organization whose members to display.
    ///   - onOrganizationChanged: Callback when the organization is modified.
    init(organization: Organization, onOrganizationChanged: (() async -> Void)? = nil) {
        self._viewModel = State(initialValue: MembersListViewModel(organization: organization))
        self.onOrganizationChanged = onOrganizationChanged
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if viewModel.isLoading && viewModel.members.isEmpty {
                ProgressView()
                    .tint(.yellow)
            } else if viewModel.members.isEmpty {
                emptyView
            } else {
                membersList
            }
        }
        .navigationTitle("Members")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if viewModel.organization.userRole == .owner || viewModel.organization.userRole == .admin {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showInviteSheet = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                            .foregroundStyle(.yellow)
                    }
                }
            }
        }
        .task {
            await viewModel.loadMembers()
        }
        .sheet(isPresented: $showInviteSheet) {
            InviteMemberView(organization: viewModel.organization) {
                await viewModel.loadMembers()
                await onOrganizationChanged?()
            }
        }
        .sheet(item: $memberToChangeRole) { member in
            ChangeRoleSheet(
                member: member,
                organizationSlug: viewModel.organization.slug
            ) { newRole in
                Task {
                    do {
                        try await viewModel.updateRole(member.id, role: newRole)
                    } catch {
                        errorMessage = error.localizedDescription
                        showError = true
                    }
                }
            }
        }
        .sheet(isPresented: $showTransferSheet) {
            TransferOwnershipSheet(
                members: viewModel.members.filter { $0.role != .owner },
                organizationName: viewModel.organization.name
            ) { memberId in
                Task {
                    do {
                        try await viewModel.transferOwnership(to: memberId)
                        await onOrganizationChanged?()
                    } catch {
                        errorMessage = error.localizedDescription
                        showError = true
                    }
                }
            }
        }
        .alert("Remove Member", isPresented: .init(
            get: { memberToRemove != nil },
            set: { if !$0 { memberToRemove = nil } }
        )) {
            Button("Cancel", role: .cancel) { memberToRemove = nil }
            Button("Remove", role: .destructive) {
                if let member = memberToRemove {
                    Task {
                        do {
                            try await viewModel.removeMember(member.id)
                            await onOrganizationChanged?()
                        } catch {
                            errorMessage = error.localizedDescription
                            showError = true
                        }
                    }
                }
            }
        } message: {
            if let member = memberToRemove {
                Text("Remove \(member.displayName) from this organization?")
            }
        }
        .alert("Leave Organization", isPresented: $showLeaveConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Leave", role: .destructive) {
                Task {
                    do {
                        try await viewModel.leaveOrganization()
                        await onOrganizationChanged?()
                    } catch {
                        errorMessage = error.localizedDescription
                        showError = true
                    }
                }
            }
        } message: {
            Text("Are you sure you want to leave \"\(viewModel.organization.name)\"?")
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Members List

    private var membersList: some View {
        ScrollView {
            LazyVStack(spacing: 1) {
                ForEach(viewModel.members) { member in
                    MemberRow(
                        member: member,
                        currentUserRole: viewModel.organization.userRole,
                        onChangeRole: {
                            memberToChangeRole = member
                        },
                        onRemove: {
                            memberToRemove = member
                        }
                    )
                }
            }
            .background(Color.white.opacity(0.05))
            .padding()

            // Action buttons
            VStack(spacing: 12) {
                if viewModel.organization.userRole == .owner {
                    Button {
                        showTransferSheet = true
                    } label: {
                        HStack {
                            Image(systemName: "arrow.right.arrow.left")
                            Text("Transfer Ownership")
                        }
                        .font(.subheadline)
                        .foregroundStyle(.yellow)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.yellow.opacity(0.1))
                        .overlay(
                            Rectangle()
                                .stroke(Color.yellow.opacity(0.3), lineWidth: 1)
                        )
                    }
                    .padding(.horizontal)
                }

                if viewModel.organization.userRole != .owner {
                    Button {
                        showLeaveConfirmation = true
                    } label: {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Leave Organization")
                        }
                        .font(.subheadline)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.05))
                        .overlay(
                            Rectangle()
                                .stroke(Color.red.opacity(0.2), lineWidth: 1)
                        )
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.3")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No members found")
                .font(.headline)
                .foregroundStyle(.white)
        }
    }
}

// MARK: - MemberRow

/// A row displaying a single organization member.
private struct MemberRow: View {
    let member: OrganizationMember
    let currentUserRole: OrganizationRole
    let onChangeRole: () -> Void
    let onRemove: () -> Void

    /// Whether the current user is the same as this member.
    private var isSelf: Bool {
        member.userId == AuthManager.shared.currentUser?.id
    }

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            memberAvatar

            // Info
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(member.displayName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.white)

                    if isSelf {
                        Text("you")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Text("@\(member.username)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Role badge
            Text(member.role.displayName)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(member.role == .owner ? .black : .white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(member.role.badgeColor)
        }
        .padding()
        .contentShape(Rectangle())
        .contextMenu {
            if !isSelf && currentUserRole == .owner && member.role != .owner {
                Button {
                    onChangeRole()
                } label: {
                    Label("Change Role", systemImage: "person.badge.key")
                }

                Button(role: .destructive) {
                    onRemove()
                } label: {
                    Label("Remove", systemImage: "person.badge.minus")
                }
            }

            if !isSelf && currentUserRole == .admin && member.role == .member {
                Button(role: .destructive) {
                    onRemove()
                } label: {
                    Label("Remove", systemImage: "person.badge.minus")
                }
            }
        }
    }

    private var memberAvatar: some View {
        Group {
            if let avatarUrl = member.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 40, height: 40)
                            .clipShape(Circle())
                    default:
                        avatarPlaceholder
                    }
                }
            } else {
                avatarPlaceholder
            }
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Color.yellow.opacity(0.3))
            .frame(width: 40, height: 40)
            .overlay(
                Text(member.displayName.prefix(1).uppercased())
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.yellow)
            )
    }
}

// MARK: - OrganizationMember Identifiable for sheets

extension OrganizationMember: @retroactive Hashable {
    static func == (lhs: OrganizationMember, rhs: OrganizationMember) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
