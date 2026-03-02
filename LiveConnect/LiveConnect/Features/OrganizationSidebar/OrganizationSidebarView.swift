//
//  OrganizationSidebarView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Sidebar drawer showing organizations and their projects.
struct OrganizationSidebarView: View {
    @Bindable var viewModel: OrganizationSidebarViewModel
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if viewModel.isLoading && viewModel.organizations.isEmpty {
                    ShimmerRow(count: 3)
                } else if let error = viewModel.error, viewModel.organizations.isEmpty {
                    errorView(error)
                } else {
                    organizationList
                }
            }
            .navigationTitle("Projects")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        isPresented = false
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .task {
            if viewModel.organizations.isEmpty {
                await viewModel.loadOrganizations()
            }
        }
    }

    // MARK: - Subviews

    private var organizationList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(viewModel.organizations) { orgWithProjects in
                    OrganizationSection(
                        organization: orgWithProjects.organization,
                        projects: orgWithProjects.projects,
                        selectedProjectId: viewModel.selectedProjectId
                    ) { project in
                        viewModel.selectProject(project)
                        isPresented = false
                    }
                }
            }
            .padding(.vertical, 8)
        }
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.yellow)

            Text("Failed to load organizations")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task {
                    await viewModel.loadOrganizations()
                }
            }
            .buttonStyle(.bordered)
            .tint(.yellow)
        }
        .padding()
    }
}

// MARK: - OrganizationSection

/// A section displaying an organization and its projects.
private struct OrganizationSection: View {
    let organization: Organization
    let projects: [Project]
    let selectedProjectId: UUID?
    let onSelectProject: (Project) -> Void

    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Organization header
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack {
                    Image(systemName: organization.isPersonal ? "person.fill" : "building.2.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(width: 20)

                    Text(organization.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }

            // Projects list
            if isExpanded {
                ForEach(projects) { project in
                    ProjectRow(
                        project: project,
                        isSelected: project.id == selectedProjectId
                    ) {
                        onSelectProject(project)
                    }
                }
            }
        }
    }
}

// MARK: - ProjectRow

/// A row displaying a single project.
private struct ProjectRow: View {
    let project: Project
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                Image(systemName: "video.fill")
                    .font(.caption)
                    .foregroundStyle(isSelected ? .yellow : .secondary)
                    .frame(width: 20)

                Text(project.name)
                    .font(.subheadline)
                    .foregroundStyle(isSelected ? .yellow : .white)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.caption)
                        .foregroundStyle(.yellow)
                }
            }
            .padding(.horizontal, 16)
            .padding(.leading, 24)
            .padding(.vertical, 10)
            .background(isSelected ? Color.yellow.opacity(0.1) : Color.clear)
            .contentShape(Rectangle())
        }
    }
}

#Preview {
    OrganizationSidebarView(
        viewModel: OrganizationSidebarViewModel(),
        isPresented: .constant(true)
    )
}
