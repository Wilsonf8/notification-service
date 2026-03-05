//
//  OrgProjectsView.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// View displaying projects in an organization with the ability to create new ones.
struct OrgProjectsView: View {
    let organization: Organization
    let tierLimits: TierLimits?
    @State private var projects: [Project] = []
    @State private var isLoading = false
    @State private var showCreateSheet = false
    @State private var showError = false
    @State private var errorMessage = ""

    /// Callback when a project is created.
    var onProjectCreated: (() async -> Void)?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if isLoading && projects.isEmpty {
                ProgressView()
                    .tint(.yellow)
            } else if projects.isEmpty {
                emptyView
            } else {
                projectsList
            }
        }
        .navigationTitle("Projects")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if canCreateProject {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCreateSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .foregroundStyle(.yellow)
                    }
                }
            }
        }
        .task {
            await loadProjects()
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateProjectSheet(organizationSlug: organization.slug) {
                await loadProjects()
                await onProjectCreated?()
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Projects List

    private var projectsList: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Tier info
                if let limits = tierLimits {
                    HStack {
                        Text("Projects")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(limits.currentProjects) / \(limits.maxProjects)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 4)
                }

                LazyVStack(spacing: 1) {
                    ForEach(projects) { project in
                        HStack {
                            Image(systemName: "video.fill")
                                .foregroundStyle(.yellow)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(project.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white)

                                if let description = project.description {
                                    Text(description)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                            }

                            Spacer()

                            Text(project.type.rawValue)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                    }
                }
                .background(Color.white.opacity(0.05))
            }
            .padding()
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No projects yet")
                .font(.headline)
                .foregroundStyle(.white)

            if canCreateProject {
                Button {
                    showCreateSheet = true
                } label: {
                    Text("Create Project")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Color.yellow)
                }
            }
        }
    }

    // MARK: - Helpers

    private var canCreateProject: Bool {
        let roleAllowed = organization.userRole == .owner || organization.userRole == .admin
        let underLimit = tierLimits == nil || (tierLimits!.currentProjects < tierLimits!.maxProjects)
        return roleAllowed && underLimit
    }

    private func loadProjects() async {
        isLoading = true
        do {
            projects = try await APIClient.shared.get(
                Endpoints.organizationProjects(slug: organization.slug)
            )
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        isLoading = false
    }
}
