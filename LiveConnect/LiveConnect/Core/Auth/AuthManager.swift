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

    /// Whether the user's account is pending deletion.
    private(set) var isPendingDeletion = false

    /// The date when the account will be permanently deleted.
    private(set) var deletionDate: String?

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
            isPendingDeletion = false
        } catch {
            if case APIError.forbidden = error {
                // 403 means account is soft-deleted — show reactivation flow
                isPendingDeletion = true
                print("RestoreSession: account is pending deletion")
                isLoading = false
                return
            }
            // Token is invalid, clear it
            print("RestoreSession error: \(error)")
            if case APIError.decodingError(let underlyingError) = error {
                print("Decoding error details: \(underlyingError)")
            }
            KeychainService.shared.clearAll()
            self.error = error
        }

        isLoading = false
    }

    /// Initiates GitHub OAuth authentication flow.
    /// - Parameter presentationAnchor: The window to present the auth sheet from.
    func signInWithGitHub(presentationAnchor: ASPresentationAnchor) async {
        await performSignIn(endpoint: Endpoints.githubOAuth, presentationAnchor: presentationAnchor)
    }

    /// Initiates Google OAuth authentication flow.
    /// - Parameter presentationAnchor: The window to present the auth sheet from.
    func signInWithGoogle(presentationAnchor: ASPresentationAnchor) async {
        await performSignIn(endpoint: Endpoints.googleOAuth, presentationAnchor: presentationAnchor)
    }

    /// Performs sign-in using the given OAuth endpoint.
    /// - Parameters:
    ///   - endpoint: The OAuth endpoint path (e.g. `/oauth2/authorization/google`).
    ///   - presentationAnchor: The window to present the auth sheet from.
    private func performSignIn(endpoint: String, presentationAnchor: ASPresentationAnchor) async {
        isLoading = true
        error = nil

        do {
            let callbackResult = try await performOAuthFlow(endpoint: endpoint, presentationAnchor: presentationAnchor)
            print("Token received: \(callbackResult.token.prefix(50))...")
            KeychainService.shared.setToken(callbackResult.token)

            if callbackResult.pendingDeletion {
                // Account is pending deletion — show reactivation flow
                isPendingDeletion = true
                deletionDate = callbackResult.deletionDate
            } else {
                currentUser = try await APIClient.shared.get(Endpoints.authMe)
                isPendingDeletion = false
                print("User loaded: \(currentUser?.username ?? "nil")")
            }
        } catch {
            print("SignIn error: \(error)")
            if case APIError.decodingError(let underlyingError) = error {
                print("Decoding error details: \(underlyingError)")
            }
            self.error = error
        }

        isLoading = false
    }

    /// Clears the current user, forcing a return to the login screen.
    func clearCurrentUser() {
        currentUser = nil
        isPendingDeletion = false
        deletionDate = nil
        error = nil
    }

    /// Clears the pending deletion state after reactivation.
    func clearPendingDeletion() {
        isPendingDeletion = false
        deletionDate = nil
    }

    /// Initiates Sign in with Apple authentication flow.
    /// Uses native ASAuthorizationAppleIDProvider and sends the identity token to the backend.
    /// - Parameter credential: The Apple ID credential from ASAuthorizationController.
    func signInWithApple(credential: ASAuthorizationAppleIDCredential) async {
        isLoading = true
        error = nil

        do {
            guard let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                throw AuthError.missingToken
            }

            // Extract name (only available on first sign-in)
            let firstName = credential.fullName?.givenName
            let lastName = credential.fullName?.familyName

            let request = AppleTokenRequest(
                identityToken: identityToken,
                authorizationCode: credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) },
                firstName: firstName,
                lastName: lastName
            )

            let response: AppleTokenResponse = try await APIClient.shared.post(
                Endpoints.appleToken,
                body: request
            )

            KeychainService.shared.setToken(response.token)

            if response.pendingDeletion {
                isPendingDeletion = true
                deletionDate = response.deletionDate
            } else {
                currentUser = try await APIClient.shared.get(Endpoints.authMe)
                isPendingDeletion = false
                print("User loaded via Apple: \(currentUser?.username ?? "nil")")
            }
        } catch {
            print("Apple SignIn error: \(error)")
            self.error = error
        }

        isLoading = false
    }

    /// Signs out the current user.
    func signOut() {
        // Unregister push token in background
        Task {
            await PushNotificationManager.shared.unregisterToken()
        }

        KeychainService.shared.clearAll()
        URLCache.shared.removeAllCachedResponses()
        currentUser = nil
        error = nil
    }

    // MARK: - Private Methods

    /// Result from an OAuth callback containing the token and deletion status.
    private struct OAuthCallbackResult {
        let token: String
        let pendingDeletion: Bool
        let deletionDate: String?
    }

    /// Performs the OAuth flow using ASWebAuthenticationSession.
    /// - Parameters:
    ///   - endpoint: The OAuth endpoint path.
    ///   - presentationAnchor: The window to present the auth sheet from.
    /// - Returns: The OAuth callback result with token and deletion status.
    private func performOAuthFlow(endpoint: String, presentationAnchor: ASPresentationAnchor) async throws -> OAuthCallbackResult {
        let authURL = URL(string: Endpoints.baseURL + endpoint + "?mobile=true")!

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

                let pendingDeletion = components.queryItems?
                    .first(where: { $0.name == "pending_deletion" })?.value == "true"
                let deletionDate = components.queryItems?
                    .first(where: { $0.name == "deletion_date" })?.value

                continuation.resume(returning: OAuthCallbackResult(
                    token: token,
                    pendingDeletion: pendingDeletion,
                    deletionDate: deletionDate
                ))
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

// MARK: - Apple Token Exchange Models

/// Request body for Apple token exchange with the backend.
struct AppleTokenRequest: Encodable {
    let identityToken: String
    let authorizationCode: String?
    let firstName: String?
    let lastName: String?
}

/// Response from the backend Apple token exchange endpoint.
struct AppleTokenResponse: Decodable {
    let token: String
    let pendingDeletion: Bool
    let deletionDate: String?
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
