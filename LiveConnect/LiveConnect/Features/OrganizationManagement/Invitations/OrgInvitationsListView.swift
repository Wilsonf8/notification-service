//
//  OrgInvitationsListView.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// Admin view showing pending invitations for an organization.
struct OrgInvitationsListView: View {
    @State private var viewModel: OrgInvitationsViewModel
    @State private var showError = false
    @State private var errorMessage = ""

    /// Initializes the view with an organization.
    /// - Parameter organization: The organization to manage invitations for.
    init(organization: Organization) {
        self._viewModel = State(initialValue: OrgInvitationsViewModel(organization: organization))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if viewModel.isLoading && viewModel.invitations.isEmpty {
                ProgressView()
                    .tint(.yellow)
            } else if viewModel.invitations.isEmpty {
                emptyView
            } else {
                invitationsList
            }
        }
        .navigationTitle("Pending Invitations")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadInvitations()
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Invitations List

    private var invitationsList: some View {
        ScrollView {
            LazyVStack(spacing: 1) {
                ForEach(viewModel.invitations) { invitation in
                    InvitationRow(invitation: invitation) {
                        Task {
                            do {
                                try await viewModel.revokeInvitation(invitation.id)
                            } catch {
                                errorMessage = error.localizedDescription
                                showError = true
                            }
                        }
                    }
                }
            }
            .background(Color.white.opacity(0.05))
            .padding()
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "envelope.open")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No pending invitations")
                .font(.headline)
                .foregroundStyle(.white)
            Text("Invite members from the Members screen.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - InvitationRow

/// A row showing a pending invitation with revoke action.
private struct InvitationRow: View {
    let invitation: OrganizationInvitation
    let onRevoke: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.yellow.opacity(0.3))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(invitation.inviteeDisplayName.prefix(1).uppercased())
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(.yellow)
                )

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(invitation.inviteeDisplayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)

                Text("@\(invitation.inviteeUsername)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text("Invited as \(invitation.role.displayName)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Revoke button
            Button(role: .destructive, action: onRevoke) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.red)
            }
        }
        .padding()
    }
}
