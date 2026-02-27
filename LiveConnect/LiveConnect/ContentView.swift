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

    /// Sheet for accepting call requests from notifications.
    @State private var requestAcceptSheet: RequestAcceptSheetData?

    /// Active call response when a request is accepted from notification.
    @State private var activeCallFromNotification: AcceptedCallResponse?

    /// Visitor name for the active call from notification.
    @State private var notificationCallVisitorName: String?

    /// WebSocket manager for calls accepted from notifications.
    @State private var notificationWebSocketManager = WebSocketManager()

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
        .onChange(of: AuthManager.shared.isAuthenticated) { oldValue, newValue in
            if !newValue {
                // User signed out — reset all cached state
                sidebarViewModel.reset()
            }
        }
        .onChange(of: NotificationRouter.shared.pendingNavigation) { _, navigation in
            handlePendingNavigation(navigation)
        }
        .sheet(item: $requestAcceptSheet) { data in
            RequestAcceptSheet(
                projectId: data.projectId,
                requestId: data.requestId
            ) { response, visitorName in
                notificationCallVisitorName = visitorName
                activeCallFromNotification = response
            }
        }
        .fullScreenCover(item: $activeCallFromNotification) { call in
            if let projectId = requestAcceptSheet?.projectId ?? sidebarViewModel.selectedProjectId {
                VideoCallView(
                    conversationId: call.conversationId,
                    visitorName: notificationCallVisitorName,
                    livekitUrl: call.liveKitUrl,
                    livekitToken: call.token,
                    projectId: projectId,
                    webSocketManager: notificationWebSocketManager
                ) {
                    activeCallFromNotification = nil
                    notificationCallVisitorName = nil
                }
            }
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
        } else if !sidebarViewModel.hasFinishedInitialLoad {
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
        } else if let error = sidebarViewModel.error {
            // Error loading organizations
            loadingErrorView(error)
        } else {
            // No projects available
            noProjectsView
        }
    }

    /// Displayed when organizations failed to load.
    private func loadingErrorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.yellow)

            Text("Failed to load projects")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task {
                    await sidebarViewModel.loadOrganizations()
                }
            }
            .buttonStyle(.bordered)
            .tint(.yellow)
        }
        .padding()
    }

    /// Displayed when loading succeeded but no projects exist.
    private var noProjectsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder")
                .font(.largeTitle)
                .foregroundStyle(.yellow)

            Text("No projects available")
                .font(.headline)
                .foregroundStyle(.white)

            Text("There are no projects in your organizations yet.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task {
                    await sidebarViewModel.loadOrganizations()
                }
            }
            .buttonStyle(.bordered)
            .tint(.yellow)
        }
        .padding()
    }

    // MARK: - Authentication

    private func checkAuthentication() async {
        await AuthManager.shared.restoreSession()

        // Re-register push token after session restore
        await PushNotificationManager.shared.registerCurrentTokenIfNeeded()

        // Small delay for smoother transition
        try? await Task.sleep(for: .milliseconds(500))

        withAnimation {
            isCheckingAuth = false
        }
    }

    // MARK: - Notification Handling

    private func handlePendingNavigation(_ navigation: NotificationNavigation?) {
        guard let navigation else { return }

        switch navigation {
        case .visitorDetail(let projectId, _):
            // Navigate to project dashboard — LiveUsersView will clear after showing the sheet
            sidebarViewModel.selectedProjectId = projectId

        case .acceptRequest(let projectId, let requestId):
            // Navigate to project and show accept sheet
            sidebarViewModel.selectedProjectId = projectId
            requestAcceptSheet = RequestAcceptSheetData(
                projectId: projectId,
                requestId: requestId
            )
            NotificationRouter.shared.clearPendingNavigation()

        case .conversationDetail(let projectId, _):
            // Navigate to project — ConversationsListView will handle opening the conversation
            sidebarViewModel.selectedProjectId = projectId
        }
    }
}

// MARK: - Request Accept Sheet Data

/// Data for presenting the request accept sheet.
struct RequestAcceptSheetData: Identifiable {
    let projectId: UUID
    let requestId: UUID

    var id: String { "\(projectId)-\(requestId)" }
}

#Preview {
    ContentView()
}
