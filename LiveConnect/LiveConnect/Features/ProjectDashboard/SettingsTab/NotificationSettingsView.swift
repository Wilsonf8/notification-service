//
//  NotificationSettingsView.swift
//  LiveConnect
//
//  Created by Claude on 2/10/26.
//

import SwiftUI

/// Settings view for configuring push notification preferences.
struct NotificationSettingsView: View {
    let projectId: UUID

    @State private var prefs = NotificationPreferences()
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var error: String?

    var body: some View {
        Form {
            Section {
                Toggle("Visitor Arrives", isOn: $prefs.notifyVisitorPresence)
                    .onChange(of: prefs.notifyVisitorPresence) { _, _ in
                        Task { await save() }
                    }

                Toggle("Visitor Requests Call", isOn: $prefs.notifyVisitorRequest)
                    .onChange(of: prefs.notifyVisitorRequest) { _, _ in
                        Task { await save() }
                    }
            } header: {
                Text("Push Notifications")
            } footer: {
                Text("Receive notifications when you're not actively using the app. Visitor arrival notifications have a 30-minute cooldown per visitor.")
            }

            Section {
                HStack {
                    Text("Notification Status")
                    Spacer()
                    if PushNotificationManager.shared.isEnabled {
                        Label("Enabled", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.subheadline)
                    } else {
                        Label("Disabled", systemImage: "xmark.circle.fill")
                            .foregroundStyle(.red)
                            .font(.subheadline)
                    }
                }

                if !PushNotificationManager.shared.isEnabled {
                    Button("Enable Notifications") {
                        Task {
                            await PushNotificationManager.shared.requestPermission()
                        }
                    }
                }
            } header: {
                Text("Device Settings")
            }

            if let error = error {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .scrollContentBackground(.hidden)
        .background(Color.black)
        .disabled(isLoading)
        .overlay {
            if isLoading {
                ProgressView()
                    .tint(.white)
            }
        }
        .task { await load() }
        .task {
            await PushNotificationManager.shared.checkAuthorizationStatus()
        }
    }

    // MARK: - Data Loading

    private func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            prefs = try await APIClient.shared.get(
                Endpoints.notificationPreferences(projectId: projectId)
            )
        } catch {
            self.error = "Failed to load preferences"
            print("Failed to load notification preferences: \(error.localizedDescription)")
        }
    }

    private func save() async {
        isSaving = true
        error = nil
        defer { isSaving = false }

        do {
            let updated: NotificationPreferences = try await APIClient.shared.put(
                Endpoints.notificationPreferences(projectId: projectId),
                body: UpdateNotificationPreferencesRequest(
                    notifyVisitorPresence: prefs.notifyVisitorPresence,
                    notifyVisitorRequest: prefs.notifyVisitorRequest
                )
            )
            prefs = updated
        } catch {
            self.error = "Failed to save preferences"
            print("Failed to save notification preferences: \(error.localizedDescription)")
        }
    }
}

#Preview {
    NavigationStack {
        NotificationSettingsView(projectId: UUID())
    }
}
