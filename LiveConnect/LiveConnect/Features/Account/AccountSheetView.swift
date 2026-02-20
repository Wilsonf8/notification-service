//
//  AccountSheetView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Account sheet showing user info and logout option.
struct AccountSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = AccountViewModel()
    @State private var showLogoutConfirmation = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 32) {
                    // User avatar and info
                    if let user = viewModel.currentUser {
                        userInfoSection(user)
                    }

                    Spacer()

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
        }
        .padding(.top, 32)
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
