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
            ) { response in
                activeCallFromNotification = response
            }
        }
        .fullScreenCover(item: $activeCallFromNotification) { call in
            if let projectId = requestAcceptSheet?.projectId ?? sidebarViewModel.selectedProjectId {
                VideoCallView(
                    conversationId: call.conversationId,
                    livekitUrl: call.liveKitUrl,
                    livekitToken: call.token,
                    projectId: projectId,
                    webSocketManager: notificationWebSocketManager
                ) {
                    activeCallFromNotification = nil
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
