//
//  AuthManager.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation
import AuthenticationServices

/// Manages authentication state and GitHub OAuth flow.
@MainActor
@Observable
final class AuthManager {
    /// Shared singleton instance.
    static let shared = AuthManager()

    /// The currently authenticated user.
    private(set) var currentUser: User?

    /// Whether authentication is in progress.
    private(set) var isLoading = false

    /// The last authentication error.
    private(set) var error: Error?

    /// Whether the user is authenticated.
    var isAuthenticated: Bool {
        currentUser != nil
    }

    /// OAuth callback URL scheme.
    private let callbackScheme = "liveconnect"

    /// Keep strong references during OAuth flow to prevent deallocation.
    private var authSession: ASWebAuthenticationSession?
    private var contextProvider: PresentationContextProvider?

    private init() {}

    // MARK: - Public Methods

    /// Attempts to restore the session from stored credentials.
    /// Call this on app launch to check for existing authentication.
    func restoreSession() async {
        guard KeychainService.shared.hasToken else {
            return
        }

        isLoading = true
        error = nil

        do {
            currentUser = try await APIClient.shared.get(Endpoints.authMe)
        } catch {
            // Token is invalid, clear it
            KeychainService.shared.clearAll()
            self.error = error
        }

        isLoading = false
    }

    /// Initiates GitHub OAuth authentication flow.
    /// - Parameter presentationAnchor: The window to present the auth sheet from.
    func signInWithGitHub(presentationAnchor: ASPresentationAnchor) async {
        isLoading = true
        error = nil

        do {
            let token = try await performOAuthFlow(presentationAnchor: presentationAnchor)
            KeychainService.shared.setToken(token)
            currentUser = try await APIClient.shared.get(Endpoints.authMe)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    /// Signs out the current user.
    func signOut() {
        KeychainService.shared.clearAll()
        currentUser = nil
        error = nil
    }

    // MARK: - Private Methods

    /// Performs the OAuth flow using ASWebAuthenticationSession.
    /// - Parameter presentationAnchor: The window to present the auth sheet from.
    /// - Returns: The JWT token from the callback.
    private func performOAuthFlow(presentationAnchor: ASPresentationAnchor) async throws -> String {
        let authURL = URL(string: Endpoints.baseURL + Endpoints.githubOAuth + "?mobile=true")!

        // Store context provider to keep it alive
        contextProvider = PresentationContextProvider(anchor: presentationAnchor)

        return try await withCheckedThrowingContinuation { [weak self] continuation in
            guard let self else {
                continuation.resume(throwing: AuthError.sessionStartFailed)
                return
            }

            var hasResumed = false

            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: callbackScheme
            ) { [weak self] callbackURL, error in
                // Clean up
                self?.authSession = nil
                self?.contextProvider = nil

                guard !hasResumed else { return }
                hasResumed = true

                if let error {
                    continuation.resume(throwing: AuthError.oauthFailed(error))
                    return
                }

                guard let callbackURL,
                      let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                      let token = components.queryItems?.first(where: { $0.name == "token" })?.value else {
                    continuation.resume(throwing: AuthError.missingToken)
                    return
                }

                continuation.resume(returning: token)
            }

            session.presentationContextProvider = contextProvider
            session.prefersEphemeralWebBrowserSession = true  // Force fresh session, no shared cookies

            // Store session to keep it alive
            self.authSession = session

            guard session.start() else {
                self.authSession = nil
                self.contextProvider = nil

                guard !hasResumed else { return }
                hasResumed = true
                continuation.resume(throwing: AuthError.sessionStartFailed)
                return
            }
        }
    }
}

// MARK: - AuthError

/// Errors that can occur during authentication.
enum AuthError: LocalizedError {
    case oauthFailed(Error)
    case missingToken
    case sessionStartFailed
    case invalidCallback

    var errorDescription: String? {
        switch self {
        case .oauthFailed(let error):
            return "OAuth failed: \(error.localizedDescription)"
        case .missingToken:
            return "No token received from authentication"
        case .sessionStartFailed:
            return "Failed to start authentication session"
        case .invalidCallback:
            return "Invalid callback URL"
        }
    }
}

// MARK: - PresentationContextProvider

/// Provides the presentation anchor for ASWebAuthenticationSession.
private final class PresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let anchor: ASPresentationAnchor

    init(anchor: ASPresentationAnchor) {
        self.anchor = anchor
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor
    }
}
