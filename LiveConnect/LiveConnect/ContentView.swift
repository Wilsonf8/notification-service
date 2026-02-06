//
//  ContentView.swift
//  LiveConnect
//
//  Created by wilson flores on 2/5/26.
//

import SwiftUI

/// Root navigation container that handles auth state routing.
struct ContentView: View {
    @State private var isCheckingAuth = true
    @State private var sidebarViewModel = OrganizationSidebarViewModel()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if isCheckingAuth {
                // Splash/loading state
                splashView
            } else if AuthManager.shared.isAuthenticated {
                // Authenticated: show dashboard or project selection
                authenticatedView
            } else {
                // Not authenticated: show login
                LoginView()
            }
        }
        .task {
            await checkAuthentication()
        }
    }

    // MARK: - Subviews

    private var splashView: some View {
        VStack(spacing: 24) {
            Image(systemName: "video.fill")
                .font(.system(size: 60))
                .foregroundStyle(.yellow)

            Text("LiveConnect")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(.white)

            ProgressView()
                .tint(.white)
        }
    }

    @ViewBuilder
    private var authenticatedView: some View {
        if let projectId = sidebarViewModel.selectedProjectId {
            ProjectDashboardView(
                projectId: projectId,
                sidebarViewModel: sidebarViewModel
            )
            .id(projectId)
        } else {
            // Loading organizations and projects
            VStack(spacing: 24) {
                ProgressView()
                    .tint(.white)

                Text("Loading projects...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .task {
                await sidebarViewModel.loadOrganizations()
            }
        }
    }

    // MARK: - Authentication

    private func checkAuthentication() async {
        await AuthManager.shared.restoreSession()

        // Small delay for smoother transition
        try? await Task.sleep(for: .milliseconds(500))

        withAnimation {
            isCheckingAuth = false
        }
    }
}

#Preview {
    ContentView()
}
