//
//  LoginView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI
import AuthenticationServices

/// Login screen with GitHub OAuth authentication.
struct LoginView: View {
    @State private var viewModel = LoginViewModel()

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color.black,
                        Color(white: 0.1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 40) {
                    Spacer()

                    // Logo and branding
                    VStack(spacing: 16) {
                        Image(systemName: "video.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(.yellow)

                        Text("LiveConnect")
                            .font(.system(size: 36, weight: .bold, design: .default))
                            .foregroundStyle(.white)

                        Text("Connect with your visitors in real-time")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    Spacer()

                    // Login section
                    VStack(spacing: 20) {
                        // GitHub sign in button
                        SignInButton(isLoading: viewModel.isLoading) {
                            await signIn()
                        }

                        // Error message
                        if let errorMessage = viewModel.errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                    }
                    .padding(.horizontal, 32)

                    Spacer()
                        .frame(height: 60)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    /// Performs the sign-in action.
    @MainActor
    private func signIn() async {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return
        }
        await viewModel.signInWithGitHub(anchor: window)
    }
}

// MARK: - SignInButton

/// GitHub sign-in button component.
private struct SignInButton: View {
    let isLoading: Bool
    let action: () async -> Void

    var body: some View {
        Button {
            Task {
                await action()
            }
        } label: {
            HStack(spacing: 12) {
                if isLoading {
                    ProgressView()
                        .tint(.black)
                } else {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.title2)
                }

                Text(isLoading ? "Signing in..." : "Sign in with GitHub")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(.white)
            .foregroundStyle(.black)
            .clipShape(RoundedRectangle(cornerRadius: 0))
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1.0)
    }
}

#Preview {
    LoginView()
}
