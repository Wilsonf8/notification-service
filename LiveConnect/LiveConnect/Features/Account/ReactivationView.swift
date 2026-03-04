//
//  ReactivationView.swift
//  LiveConnect
//
//  Created by Claude on 3/3/26.
//

import SwiftUI

/// Screen shown when a soft-deleted user logs in, offering reactivation or continued deletion.
struct ReactivationView: View {
    @State private var viewModel = AccountViewModel()
    @State private var isReactivating = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(.yellow)

                VStack(spacing: 12) {
                    Text("Account Pending Deletion")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    if let deletionDate = AuthManager.shared.deletionDate {
                        Text("Your account is scheduled for permanent deletion on \(deletionDate).")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    } else {
                        Text("Your account is scheduled for permanent deletion within 30 days.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    Text("You can reactivate your account to restore full access, or sign out to continue with deletion.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 32)

                Spacer()

                VStack(spacing: 12) {
                    // Reactivate button
                    Button {
                        Task {
                            isReactivating = true
                            let success = await viewModel.reactivateAccount()
                            if success {
                                AuthManager.shared.clearPendingDeletion()
                                // Re-fetch the user after reactivation
                                await AuthManager.shared.restoreSession()
                            }
                            isReactivating = false
                        }
                    } label: {
                        HStack {
                            if isReactivating {
                                ProgressView()
                                    .tint(.black)
                            }
                            Text("Reactivate Account")
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.yellow)
                        .foregroundStyle(.black)
                    }
                    .disabled(isReactivating)

                    // Continue with deletion (sign out)
                    Button {
                        AuthManager.shared.signOut()
                    } label: {
                        Text("Sign Out")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.white.opacity(0.05))
                    }
                    .disabled(isReactivating)
                }
                .padding(.horizontal, 32)

                // Error display
                if let error = viewModel.deletionError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Spacer()
                    .frame(height: 40)
            }
        }
    }
}

#Preview {
    ReactivationView()
}
