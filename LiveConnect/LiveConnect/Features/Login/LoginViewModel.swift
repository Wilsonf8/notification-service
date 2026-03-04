//
//  LoginViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation
import AuthenticationServices

/// View model for the login screen.
@MainActor
@Observable
final class LoginViewModel {
    /// Whether authentication is in progress.
    var isLoading: Bool {
        AuthManager.shared.isLoading
    }

    /// The last error that occurred.
    var error: Error? {
        AuthManager.shared.error
    }

    /// Error message to display.
    var errorMessage: String? {
        error?.localizedDescription
    }

    /// Initiates GitHub OAuth sign-in.
    /// - Parameter anchor: The presentation anchor for the auth sheet.
    func signInWithGitHub(anchor: ASPresentationAnchor) async {
        await AuthManager.shared.signInWithGitHub(presentationAnchor: anchor)
    }

    /// Initiates Google OAuth sign-in.
    /// - Parameter anchor: The presentation anchor for the auth sheet.
    func signInWithGoogle(anchor: ASPresentationAnchor) async {
        await AuthManager.shared.signInWithGoogle(presentationAnchor: anchor)
    }

    /// Handles a successful Apple Sign-In credential.
    /// - Parameter credential: The Apple ID credential from ASAuthorizationController.
    func signInWithApple(credential: ASAuthorizationAppleIDCredential) async {
        await AuthManager.shared.signInWithApple(credential: credential)
    }
}
