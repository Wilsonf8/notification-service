//
//  PushNotificationManager.swift
//  LiveConnect
//
//  Created by Claude on 2/10/26.
//

import Foundation
import UIKit
import UserNotifications

/// Manages push notification registration and token management.
@MainActor
@Observable
final class PushNotificationManager {
    /// Shared singleton instance.
    static let shared = PushNotificationManager()

    /// The current device token, if registered.
    private(set) var currentToken: String?

    /// Whether push notifications are enabled.
    private(set) var isEnabled: Bool = false

    private init() {}

    // MARK: - Permission & Registration

    /// Requests notification permission and registers for remote notifications.
    func requestPermission() async {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])

            isEnabled = granted

            if granted {
                // Register for remote notifications on main thread
                UIApplication.shared.registerForRemoteNotifications()
                print("Push notifications enabled")
            } else {
                print("Push notifications not authorized")
            }
        } catch {
            print("Failed to request notification permission: \(error.localizedDescription)")
        }
    }

    /// Registers the device token with the backend.
    /// - Parameter token: The APNs device token as a hex string.
    func registerToken(_ token: String) async {
        currentToken = token

        // Only register with backend if user is authenticated
        guard KeychainService.shared.hasToken else {
            print("Skipping token registration - user not authenticated")
            return
        }

        do {
            let bundleId = Bundle.main.bundleIdentifier ?? "com.liveconnect.LiveConnect"
            try await APIClient.shared.post(
                Endpoints.deviceTokens,
                body: RegisterDeviceTokenRequest(token: token, bundleId: bundleId)
            )
            print("Device token registered with backend")
        } catch {
            print("Failed to register device token: \(error.localizedDescription)")
        }
    }

    /// Unregisters the device token from the backend (e.g., on logout).
    func unregisterToken() async {
        guard let token = currentToken else { return }

        do {
            try await APIClient.shared.delete(
                Endpoints.deviceTokens,
                body: UnregisterDeviceTokenRequest(token: token)
            )
            print("Device token unregistered")
        } catch {
            print("Failed to unregister device token: \(error.localizedDescription)")
        }
    }

    /// Re-registers the current token after login.
    func registerCurrentTokenIfNeeded() async {
        guard let token = currentToken else { return }
        await registerToken(token)
    }

    // MARK: - Permission Status

    /// Checks the current notification authorization status.
    func checkAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        isEnabled = settings.authorizationStatus == .authorized
    }
}

// MARK: - Request DTOs

/// Request body for registering a device token.
struct RegisterDeviceTokenRequest: Encodable {
    let token: String
    let bundleId: String
}

/// Request body for unregistering a device token.
struct UnregisterDeviceTokenRequest: Encodable {
    let token: String
}
