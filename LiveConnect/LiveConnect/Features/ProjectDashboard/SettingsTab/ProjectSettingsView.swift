//
//  ProjectSettingsView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Settings view for the current project.
struct ProjectSettingsView: View {
    let project: Project?

    @State private var showNotificationSettings = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if let project {
                    // Notifications Section
                    SettingsSection(title: "Preferences") {
                        Button {
                            showNotificationSettings = true
                        } label: {
                            HStack {
                                Image(systemName: "bell.fill")
                                    .foregroundStyle(.yellow)
                                Text("Notifications")
                                    .foregroundStyle(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding()
                            .background(Color.white.opacity(0.05))
                        }
                    }

                    // Project Info Section
                    SettingsSection(title: "Project Information") {
                        SettingsRow(label: "Name", value: project.name)
                        SettingsRow(label: "ID", value: project.id.uuidString.prefix(8).description + "...")
                        if let description = project.description {
                            SettingsRow(label: "Description", value: description)
                        }
                        SettingsRow(label: "Type", value: project.type.rawValue)
                    }

                    // App Info Section
                    SettingsSection(title: "App Information") {
                        SettingsRow(label: "Version", value: appVersion)
                        SettingsRow(label: "Build", value: buildNumber)
                    }

                    // Support Section
                    SettingsSection(title: "Support") {
                        Button {
                            // Open help URL
                            if let url = URL(string: "https://hooman.live/docs") {
                                UIApplication.shared.open(url)
                            }
                        } label: {
                            HStack {
                                Text("Documentation")
                                    .foregroundStyle(.white)
                                Spacer()
                                Image(systemName: "arrow.up.right")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding()
                            .background(Color.white.opacity(0.05))
                        }
                    }
                } else {
                    DotWaveLoader(.regular)
                }
            }
            .padding()
        }
        .sheet(isPresented: $showNotificationSettings) {
            if let project {
                NavigationStack {
                    NotificationSettingsView(projectId: project.id)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") {
                                    showNotificationSettings = false
                                }
                            }
                        }
                }
            }
        }
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    private var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
}

// MARK: - SettingsSection

private struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .padding(.leading, 4)

            VStack(spacing: 1) {
                content
            }
            .background(Color.white.opacity(0.05))
        }
    }
}

// MARK: - SettingsRow

private struct SettingsRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
                .multilineTextAlignment(.trailing)
        }
        .padding()
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        ProjectSettingsView(
            project: Project(
                id: UUID(),
                name: "My Project",
                description: "A test project",
                type: .liveconnect
            )
        )
    }
}
