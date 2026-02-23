//
//  OrganizationSidebarViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// View model for the organization sidebar.
@MainActor
@Observable
final class OrganizationSidebarViewModel {
    /// Organizations and their projects.
    private(set) var organizations: [OrganizationWithProjects] = []

    /// Whether data is loading.
    private(set) var isLoading = false

    /// The last error that occurred.
    private(set) var error: Error?

    /// The currently selected project ID.
    var selectedProjectId: UUID? {
        didSet {
            if let projectId = selectedProjectId {
                saveLastVisitedProject(projectId)
            }
        }
    }

    /// UserDefaults key for last visited project.
    private let lastVisitedProjectKey = "lastVisitedProjectId"

    // MARK: - Public Methods

    /// Loads organizations and their projects.
    func loadOrganizations() async {
        isLoading = true
        error = nil

        print("OrganizationSidebarViewModel: Starting to load organizations...")

        do {
            print("OrganizationSidebarViewModel: Fetching from \(Endpoints.organizations)")
            let orgs: [Organization] = try await APIClient.shared.get(Endpoints.organizations)
            print("OrganizationSidebarViewModel: Loaded \(orgs.count) organizations")

            // Load projects for each organization in parallel
            var orgsWithProjects: [OrganizationWithProjects] = []

            await withTaskGroup(of: (Organization, [Project])?.self) { group in
                for org in orgs {
                    group.addTask {
                        do {
                            let projects: [Project] = try await APIClient.shared.get(
                                Endpoints.organizationProjects(slug: org.slug)
                            )
                            return (org, projects)
                        } catch {
                            return nil
                        }
                    }
                }

                for await result in group {
                    if let (org, projects) = result {
                        orgsWithProjects.append(OrganizationWithProjects(
                            organization: org,
                            projects: projects
                        ))
                    }
                }
            }

            // Sort organizations: personal first, then alphabetically
            organizations = orgsWithProjects.sorted { lhs, rhs in
                if lhs.organization.isPersonal != rhs.organization.isPersonal {
                    return lhs.organization.isPersonal
                }
                return lhs.organization.name < rhs.organization.name
            }

            // Restore last visited project or select first available
            if selectedProjectId == nil {
                selectedProjectId = loadLastVisitedProject() ?? organizations.first?.projects.first?.id
            }
        } catch {
            print("OrganizationSidebarViewModel: Error loading organizations: \(error)")
            if case APIError.decodingError(let underlyingError) = error {
                print("OrganizationSidebarViewModel: Decoding error details: \(underlyingError)")
            }
            self.error = error
        }

        isLoading = false
        print("OrganizationSidebarViewModel: Finished loading, isLoading=\(isLoading)")
    }

    /// Selects a project.
    /// - Parameter project: The project to select.
    func selectProject(_ project: Project) {
        selectedProjectId = project.id
    }

    /// Resets all state for sign-out. Clears cached organizations, selected project, and UserDefaults.
    func reset() {
        organizations = []
        selectedProjectId = nil
        error = nil
        UserDefaults.standard.removeObject(forKey: lastVisitedProjectKey)
    }

    // MARK: - Private Methods

    /// Saves the last visited project to UserDefaults.
    private func saveLastVisitedProject(_ projectId: UUID) {
        UserDefaults.standard.set(projectId.uuidString, forKey: lastVisitedProjectKey)
    }

    /// Loads the last visited project from UserDefaults.
    private func loadLastVisitedProject() -> UUID? {
        guard let string = UserDefaults.standard.string(forKey: lastVisitedProjectKey) else {
            return nil
        }
        return UUID(uuidString: string)
    }
}

// MARK: - OrganizationWithProjects

/// An organization with its associated projects.
struct OrganizationWithProjects: Identifiable, Sendable {
    let organization: Organization
    let projects: [Project]

    var id: UUID { organization.id }
}
