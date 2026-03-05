//
//  PendingInvitationsView.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// View showing all pending invitations received by the current user.
struct PendingInvitationsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = PendingInvitationsViewModel()
    @State private var showError = false
    @State private var errorMessage = ""

    /// Callback when an invitation is accepted (to refresh orgs).
    var onInvitationAccepted: (() async -> Void)?

    var body: some View {
        NavigationStack {
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
            .navigationTitle("Invitations")
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
                await viewModel.loadInvitations()
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    // MARK: - Invitations List

    private var invitationsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.invitations) { invitation in
                    PendingInvitationCard(
                        invitation: invitation,
                        isProcessing: viewModel.isProcessing,
                        onAccept: {
                            Task {
                                do {
                                    try await viewModel.accept(invitation.id)
                                    await onInvitationAccepted?()
                                } catch {
                                    errorMessage = error.localizedDescription
                                    showError = true
                                }
                            }
                        },
                        onDecline: {
                            Task {
                                do {
                                    try await viewModel.decline(invitation.id)
                                } catch {
                                    errorMessage = error.localizedDescription
                                    showError = true
                                }
                            }
                        }
                    )
                }
            }
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
            Text("You'll see invitations from organizations here.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// MARK: - PendingInvitationCard

/// A card displaying a pending invitation with accept/decline actions.
private struct PendingInvitationCard: View {
    let invitation: OrganizationInvitation
    let isProcessing: Bool
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Organization info
            HStack {
                Image(systemName: "building.2.fill")
                    .foregroundStyle(.yellow)

                VStack(alignment: .leading, spacing: 2) {
                    Text(invitation.organizationName)
                        .font(.headline)
                        .foregroundStyle(.white)

                    Text("Invited by @\(invitation.inviterUsername)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Role badge
                Text(invitation.role.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(invitation.role.badgeColor)
            }

            // Actions
            HStack(spacing: 12) {
                Button(action: onDecline) {
                    Text("Decline")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.1))
                }
                .disabled(isProcessing)

                Button(action: onAccept) {
                    Text("Accept")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.yellow)
                }
                .disabled(isProcessing)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
    }
}

#Preview {
    PendingInvitationsView()
}
