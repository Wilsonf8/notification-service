//
//  LoginView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI
import AuthenticationServices

/// Login screen with OAuth authentication.
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
                    VStack(spacing: 12) {
                        // Google sign in button
                        SignInButton(
                            title: "Sign in with Google",
                            icon: "g.circle.fill",
                            isLoading: viewModel.isLoading,
                            backgroundColor: .white,
                            foregroundColor: .black
                        ) {
                            await signIn(provider: .google)
                        }

                        // GitHub sign in button
                        SignInButton(
                            title: "Sign in with GitHub",
                            icon: "person.crop.circle.fill",
                            isLoading: viewModel.isLoading,
                            backgroundColor: Color(white: 0.15),
                            foregroundColor: .white
                        ) {
                            await signIn(provider: .github)
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

    /// OAuth provider type.
    private enum OAuthProvider {
        case google, github
    }

    /// Performs the sign-in action for the given provider.
    /// - Parameter provider: The OAuth provider to sign in with.
    @MainActor
    private func signIn(provider: OAuthProvider) async {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return
        }
        switch provider {
        case .google:
            await viewModel.signInWithGoogle(anchor: window)
        case .github:
            await viewModel.signInWithGitHub(anchor: window)
        }
    }
}

// MARK: - SignInButton

/// OAuth sign-in button component.
private struct SignInButton: View {
    let title: String
    let icon: String
    let isLoading: Bool
    let backgroundColor: Color
    let foregroundColor: Color
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
                        .tint(foregroundColor)
                } else {
                    Image(systemName: icon)
                        .font(.title2)
                }

                Text(isLoading ? "Signing in..." : title)
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 0))
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1.0)
    }
}

#Preview {
    LoginView()
}
