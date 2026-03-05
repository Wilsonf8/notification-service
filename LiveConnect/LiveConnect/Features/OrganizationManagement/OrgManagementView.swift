//
//  OrgManagementView.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// Organization management screen showing settings, members, invitations, and projects.
struct OrgManagementView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var viewModel: OrgManagementViewModel
    @State private var showError = false
    @State private var errorMessage = ""

    /// Callback when the organization is deleted or modified.
    var onOrganizationChanged: (() async -> Void)?

    /// Initializes the view with an organization.
    /// - Parameters:
    ///   - organization: The organization to manage.
    ///   - onOrganizationChanged: Callback when the organization is modified.
    init(organization: Organization, onOrganizationChanged: (() async -> Void)? = nil) {
        self._viewModel = State(initialValue: OrgManagementViewModel(organization: organization))
        self.onOrganizationChanged = onOrganizationChanged
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        orgInfoSection
                        editNameSection
                        tierLimitsSection
                        billingSection
                        navigationSection
                        dangerZoneSection
                    }
                    .padding()
                }
            }
            .navigationTitle(viewModel.organization.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .task {
                await viewModel.loadTierLimits()
            }
            .alert("Delete Organization", isPresented: $viewModel.showDeleteConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task {
                        do {
                            try await viewModel.deleteOrganization()
                            await onOrganizationChanged?()
                            dismiss()
                        } catch {
                            errorMessage = error.localizedDescription
                            showError = true
                        }
                    }
                }
            } message: {
                Text("Are you sure you want to permanently delete \"\(viewModel.organization.name)\"? This action cannot be undone.")
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    // MARK: - Organization Info Section

    private var orgInfoSection: some View {
        OrgSettingsSection(title: "Organization") {
            OrgSettingsRow(label: "Name", value: viewModel.organization.name)
            OrgSettingsRow(label: "Slug", value: viewModel.organization.slug)
            OrgSettingsRow(label: "Your Role", value: viewModel.organization.userRole.displayName)
            OrgSettingsRow(label: "Type", value: viewModel.organization.isPersonal ? "Personal" : "Team")
        }
    }

    // MARK: - Edit Name Section

    @ViewBuilder
    private var editNameSection: some View {
        if viewModel.organization.userRole == .owner || viewModel.organization.userRole == .admin {
            OrgSettingsSection(title: "Edit Name") {
                VStack(spacing: 12) {
                    TextField("Organization name", text: $viewModel.editedName)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(Color.white.opacity(0.05))
                        .foregroundStyle(.white)
                        .autocorrectionDisabled()

                    Button {
                        Task {
                            do {
                                try await viewModel.updateName()
                                await onOrganizationChanged?()
                            } catch {
                                errorMessage = error.localizedDescription
                                showError = true
                            }
                        }
                    } label: {
                        HStack {
                            if viewModel.isSaving {
                                ProgressView()
                                    .tint(.black)
                            }
                            Text(viewModel.nameSaved ? "Saved" : "Save")
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(viewModel.nameSaved ? Color.green : Color.yellow)
                    }
                    .disabled(viewModel.isSaving || viewModel.editedName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding()
            }
        }
    }

    // MARK: - Tier Limits Section

    private var tierLimitsSection: some View {
        OrgSettingsSection(title: "Usage & Limits") {
            if let limits = viewModel.tierLimits {
                OrgSettingsRow(label: "Tier", value: limits.tier)
                OrgSettingsRow(label: "Members", value: "\(limits.currentMembers) / \(limits.maxMembers)")
                OrgSettingsRow(label: "Projects", value: "\(limits.currentProjects) / \(limits.maxProjects)")
                OrgSettingsRow(label: "Status", value: limits.orgActive ? "Active" : "Inactive")
            } else if viewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(.yellow)
                    Spacer()
                }
                .padding()
            } else {
                OrgSettingsRow(label: "Status", value: "Unable to load")
            }
        }
    }

    // MARK: - Billing Section

    private var billingSection: some View {
        OrgSettingsSection(title: "Billing") {
            Button {
                if let url = URL(string: "https://hooman.live/dashboard/o/\(viewModel.organization.slug)/billing") {
                    openURL(url)
                }
            } label: {
                HStack {
                    Image(systemName: "creditcard")
                        .foregroundStyle(.yellow)
                    Text("Manage Billing on Web")
                        .foregroundStyle(.white)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color.white.opacity(0.05))
            }
        }
    }

    // MARK: - Navigation Section

    private var navigationSection: some View {
        OrgSettingsSection(title: "Manage") {
            NavigationLink {
                MembersListView(organization: viewModel.organization, onOrganizationChanged: onOrganizationChanged)
            } label: {
                HStack {
                    Image(systemName: "person.3.fill")
                        .foregroundStyle(.yellow)
                    Text("Members")
                        .foregroundStyle(.white)
                    Spacer()
                    if let limits = viewModel.tierLimits {
                        Text("\(limits.currentMembers)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color.white.opacity(0.05))
            }

            if viewModel.organization.userRole == .owner || viewModel.organization.userRole == .admin {
                if viewModel.tierLimits?.invitationsEnabled == true {
                    NavigationLink {
                        OrgInvitationsListView(organization: viewModel.organization)
                    } label: {
                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundStyle(.yellow)
                            Text("Pending Invitations")
                                .foregroundStyle(.white)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(Color.white.opacity(0.05))
                    }
                }

                NavigationLink {
                    OrgProjectsView(
                        organization: viewModel.organization,
                        tierLimits: viewModel.tierLimits,
                        onProjectCreated: onOrganizationChanged
                    )
                } label: {
                    HStack {
                        Image(systemName: "folder.fill")
                            .foregroundStyle(.yellow)
                        Text("Projects")
                            .foregroundStyle(.white)
                        Spacer()
                        if let limits = viewModel.tierLimits {
                            Text("\(limits.currentProjects)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))
                }
            }
        }
    }

    // MARK: - Danger Zone Section

    @ViewBuilder
    private var dangerZoneSection: some View {
        if viewModel.organization.userRole == .owner && !viewModel.organization.isPersonal {
            VStack(alignment: .leading, spacing: 8) {
                Text("DANGER ZONE")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.red.opacity(0.7))
                    .textCase(.uppercase)
                    .padding(.leading, 4)

                Button {
                    viewModel.showDeleteConfirmation = true
                } label: {
                    HStack {
                        Image(systemName: "trash")
                        Text("Delete Organization")
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
                .disabled(viewModel.isDeleting)
                .opacity(viewModel.isDeleting ? 0.5 : 1.0)
            }
        }
    }
}

// MARK: - OrgSettingsSection

/// A section in the organization settings screen.
struct OrgSettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .padding(.leading, 4)

            VStack(spacing: 1) {
                content
            }
            .background(Color.white.opacity(0.05))
        }
    }
}

// MARK: - OrgSettingsRow

/// A label-value row in the organization settings screen.
struct OrgSettingsRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
                .multilineTextAlignment(.trailing)
        }
        .padding()
    }
}

// MARK: - OrganizationRole Display

extension OrganizationRole {
    /// Human-readable display name for the role.
    var displayName: String {
        switch self {
        case .owner: return "Owner"
        case .admin: return "Admin"
        case .member: return "Member"
        }
    }

    /// Color associated with the role for badges.
    var badgeColor: Color {
        switch self {
        case .owner: return .yellow
        case .admin: return .blue
        case .member: return .gray
        }
    }
}

#Preview {
    OrgManagementView(
        organization: Organization(
            id: UUID(),
            name: "My Team",
            slug: "my-team",
            isPersonal: false,
            userRole: .owner
        )
    )
}
