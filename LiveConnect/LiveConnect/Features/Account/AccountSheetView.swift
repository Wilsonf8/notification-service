//
//  AccountSheetView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Account sheet showing user info, support links, and account management.
struct AccountSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var viewModel = AccountViewModel()
    @State private var showLogoutConfirmation = false
    @State private var showInvitations = false
    @State private var deleteConfirmationText = ""
    @State private var editFirstName = ""
    @State private var editLastName = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 32) {
                        // User avatar and info
                        if let user = viewModel.currentUser {
                            userInfoSection(user)
                        }

                        // Invitations section
                        invitationsSection

                        // Links section
                        linksSection

                        // Danger Zone
                        dangerZoneSection

                        // Logout button
                        Button {
                            showLogoutConfirmation = true
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("Sign Out")
                            }
                            .font(.headline)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .overlay(
                                Rectangle()
                                    .stroke(Color.red.opacity(0.3), lineWidth: 1)
                            )
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 32)
                    }
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .alert("Sign Out", isPresented: $showLogoutConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    viewModel.signOut()
                    dismiss()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
            // Deletion blockers alert
            .alert("Cannot Delete Account", isPresented: $viewModel.showBlockerAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                if let blockers = viewModel.preflightResponse?.blockers, !blockers.isEmpty {
                    let names = blockers.map(\.name).joined(separator: ", ")
                    Text("You must transfer ownership of the following organizations before deleting your account: \(names)")
                } else {
                    Text("Your account cannot be deleted at this time.")
                }
            }
            // Deletion confirmation sheet
            .sheet(isPresented: $viewModel.showDeletionConfirmation) {
                deleteConfirmationText = ""
            } content: {
                deletionConfirmationSheet
            }
            // Deletion error alert
            .alert("Error", isPresented: .init(
                get: { viewModel.deletionError != nil },
                set: { if !$0 { viewModel.deletionError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.deletionError ?? "An unexpected error occurred.")
            }
            .sheet(isPresented: $showInvitations) {
                PendingInvitationsView()
            }
            .sheet(isPresented: $viewModel.showEditProfile) {
                viewModel.profileError = nil
            } content: {
                editProfileSheet
            }
        }
    }

    // MARK: - User Info Section

    private func userInfoSection(_ user: User) -> some View {
        VStack(spacing: 16) {
            // Avatar
            if let avatarUrl = user.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 80, height: 80)
                            .clipShape(Circle())
                    case .failure, .empty:
                        avatarPlaceholder(for: user)
                    @unknown default:
                        avatarPlaceholder(for: user)
                    }
                }
            } else {
                avatarPlaceholder(for: user)
            }

            // Name and email
            VStack(spacing: 4) {
                Text(user.displayName)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text(user.email ?? "No email")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // User details card
            VStack(spacing: 0) {
                DetailRow(icon: "person", label: "Username", value: user.username)
                Divider().background(Color.white.opacity(0.1))
                DetailRow(icon: "envelope", label: "Email", value: user.email ?? "Not set")
                Divider().background(Color.white.opacity(0.1))
                DetailRow(icon: "key", label: "User ID", value: String(user.id.uuidString.prefix(8)) + "...")
            }
            .background(Color.white.opacity(0.05))
            .padding(.horizontal)

            // Edit Profile button
            Button {
                editFirstName = user.firstName ?? ""
                editLastName = user.lastName ?? ""
                viewModel.showEditProfile = true
            } label: {
                HStack {
                    Image(systemName: "pencil")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Edit Profile")
                        .foregroundStyle(.white)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }
            .background(Color.white.opacity(0.05))
            .padding(.horizontal)
        }
        .padding(.top, 32)
    }

    // MARK: - Invitations Section

    private var invitationsSection: some View {
        Button {
            showInvitations = true
        } label: {
            HStack {
                Image(systemName: "envelope")
                    .foregroundStyle(.secondary)
                    .frame(width: 24)
                Text("Invitations")
                    .foregroundStyle(.white)
                Spacer()
                if InvitationService.shared.pendingCount > 0 {
                    Text("\(InvitationService.shared.pendingCount)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(.black)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.yellow)
                }
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .background(Color.white.opacity(0.05))
        .padding(.horizontal)
    }

    // MARK: - Links Section

    private var linksSection: some View {
        VStack(spacing: 0) {
            // Privacy Policy
            Button {
                if let url = URL(string: "https://hooman.live/privacy") {
                    openURL(url)
                }
            } label: {
                HStack {
                    Image(systemName: "hand.raised")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Privacy Policy")
                        .foregroundStyle(.white)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }

            Divider().background(Color.white.opacity(0.1))

            // Help & Support
            Button {
                if let url = URL(string: "mailto:support@hooman.live") {
                    openURL(url)
                }
            } label: {
                HStack {
                    Image(systemName: "questionmark.circle")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Help & Support")
                        .foregroundStyle(.white)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }
        }
        .background(Color.white.opacity(0.05))
        .padding(.horizontal)
    }

    // MARK: - Danger Zone Section

    private var dangerZoneSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("DANGER ZONE")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.red.opacity(0.7))
                .textCase(.uppercase)
                .padding(.leading, 4)

            Button {
                Task {
                    await viewModel.checkDeletionEligibility()
                }
            } label: {
                HStack {
                    Image(systemName: "trash")
                    Text("Delete Account")
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
            .disabled(viewModel.isDeletionLoading)
            .opacity(viewModel.isDeletionLoading ? 0.5 : 1.0)
        }
        .padding(.horizontal)
    }

    // MARK: - Deletion Confirmation Sheet

    private var deletionConfirmationSheet: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.red)

                    Text("Delete Account")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    VStack(alignment: .leading, spacing: 12) {
                        Text("This will permanently delete your account after a 30-day grace period.")
                            .foregroundStyle(.white)

                        Text("What happens:")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.top, 4)

                        BulletPoint(text: "Your account will be deactivated immediately")
                        BulletPoint(text: "After 30 days, all personal data will be permanently removed")
                        BulletPoint(text: "CRM data (visitor records, notes) will be anonymized, not deleted")
                        BulletPoint(text: "You can reactivate within 30 days by logging in")
                    }
                    .font(.subheadline)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Type **delete my account** to confirm:")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        TextField("delete my account", text: $deleteConfirmationText)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .overlay(
                                Rectangle()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }

                    Button {
                        Task {
                            await viewModel.deleteAccount()
                            dismiss()
                        }
                    } label: {
                        HStack {
                            if viewModel.isDeletionLoading {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text("Permanently Delete Account")
                        }
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            deleteConfirmationText.lowercased() == "delete my account"
                                ? Color.red : Color.red.opacity(0.3)
                        )
                    }
                    .disabled(
                        deleteConfirmationText.lowercased() != "delete my account"
                            || viewModel.isDeletionLoading
                    )

                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.showDeletionConfirmation = false
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .presentationDetents([.large])
    }

    // MARK: - Edit Profile Sheet

    private var editProfileSheet: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("First Name")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            TextField("First name", text: $editFirstName)
                                .textFieldStyle(.plain)
                                .padding()
                                .background(Color.white.opacity(0.05))
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                                .autocorrectionDisabled()
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Last Name")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            TextField("Last name", text: $editLastName)
                                .textFieldStyle(.plain)
                                .padding()
                                .background(Color.white.opacity(0.05))
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                                .autocorrectionDisabled()
                        }
                    }

                    if let error = viewModel.profileError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task {
                            await viewModel.updateProfile(
                                firstName: editFirstName.isEmpty ? nil : editFirstName,
                                lastName: editLastName.isEmpty ? nil : editLastName
                            )
                        }
                    } label: {
                        HStack {
                            if viewModel.isProfileSaving {
                                ProgressView()
                                    .tint(.black)
                            }
                            Text("Save")
                        }
                        .font(.headline)
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.yellow)
                    }
                    .disabled(viewModel.isProfileSaving)

                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.showEditProfile = false
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .presentationDetents([.medium])
    }

    private func avatarPlaceholder(for user: User) -> some View {
        Circle()
            .fill(Color.yellow.opacity(0.3))
            .frame(width: 80, height: 80)
            .overlay(
                Text((user.firstName ?? user.username).prefix(1).uppercased())
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundStyle(.yellow)
            )
    }
}

// MARK: - BulletPoint

private struct BulletPoint: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\u{2022}")
                .foregroundStyle(.secondary)
            Text(text)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - DetailRow

private struct DetailRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.secondary)
                .frame(width: 24)

            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
        }
        .padding()
    }
}

#Preview {
    AccountSheetView()
}
