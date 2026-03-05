//
//  CreateProjectSheet.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// Sheet for creating a new project in an organization.
struct CreateProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    let organizationSlug: String
    @State private var name = ""
    @State private var isCreating = false
    @State private var error: String?

    /// Callback when a project is successfully created.
    var onCreated: (() async -> Void)?

    /// Initializes the sheet with an organization slug.
    /// - Parameters:
    ///   - organizationSlug: The organization slug to create the project in.
    ///   - onCreated: Callback when a project is created.
    init(organizationSlug: String, onCreated: (() async -> Void)? = nil) {
        self.organizationSlug = organizationSlug
        self.onCreated = onCreated
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    Image(systemName: "folder.badge.plus")
                        .font(.system(size: 48))
                        .foregroundStyle(.yellow)

                    Text("Create Project")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Project Name")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        TextField("e.g. My Website", text: $name)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .overlay(
                                Rectangle()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                            .foregroundStyle(.white)
                            .autocorrectionDisabled()
                    }

                    HStack {
                        Text("Type")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("LiveConnect")
                            .font(.subheadline)
                            .foregroundStyle(.white)
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))

                    if let error {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await createProject() }
                    } label: {
                        HStack {
                            if isCreating {
                                ProgressView()
                                    .tint(.black)
                            }
                            Text("Create Project")
                        }
                        .font(.headline)
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? Color.yellow.opacity(0.3) : Color.yellow
                        )
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isCreating)

                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func createProject() async {
        isCreating = true
        error = nil

        do {
            let request = CreateProjectRequest(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                type: "LIVECONNECT"
            )
            let _: Project = try await APIClient.shared.post(
                Endpoints.organizationProjects(slug: organizationSlug),
                body: request
            )
            await onCreated?()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }

        isCreating = false
    }
}

#Preview {
    CreateProjectSheet(organizationSlug: "my-team")
}
