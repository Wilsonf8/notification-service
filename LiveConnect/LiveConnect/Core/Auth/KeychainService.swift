//
//  KeychainService.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation
import KeychainAccess

/// Wrapper for secure token storage in the iOS Keychain.
final class KeychainService: Sendable {
    /// Shared singleton instance.
    static let shared = KeychainService()

    /// Keychain instance scoped to the app's bundle identifier.
    private let keychain: Keychain

    /// Key for storing the JWT access token.
    private let tokenKey = "auth_token"

    /// Key for storing the refresh token.
    private let refreshTokenKey = "refresh_token"

    private init() {
        keychain = Keychain(service: "com.liveconnect.LiveConnect")
            .accessibility(.whenUnlockedThisDeviceOnly)
    }

    // MARK: - Token Management

    /// Stores the authentication token securely.
    /// - Parameter token: The JWT token to store.
    func setToken(_ token: String) {
        keychain[tokenKey] = token
    }

    /// Retrieves the stored authentication token.
    /// - Returns: The stored JWT token, or nil if not found.
    func getToken() -> String? {
        keychain[tokenKey]
    }

    /// Removes the stored authentication token.
    func removeToken() {
        keychain[tokenKey] = nil
    }

    // MARK: - Refresh Token Management

    /// Stores the refresh token securely.
    /// - Parameter token: The refresh token to store.
    func setRefreshToken(_ token: String) {
        keychain[refreshTokenKey] = token
    }

    /// Retrieves the stored refresh token.
    /// - Returns: The stored refresh token, or nil if not found.
    func getRefreshToken() -> String? {
        keychain[refreshTokenKey]
    }

    /// Removes the stored refresh token.
    func removeRefreshToken() {
        keychain[refreshTokenKey] = nil
    }

    // MARK: - Clear All

    /// Clears all stored credentials.
    func clearAll() {
        removeToken()
        removeRefreshToken()
    }

    /// Checks if the user has a stored token.
    /// - Returns: True if a token exists.
    var hasToken: Bool {
        getToken() != nil
    }
}
