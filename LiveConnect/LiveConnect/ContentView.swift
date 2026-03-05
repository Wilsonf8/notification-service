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

    /// Whether to show invitations sheet from a push notification.
    @State private var showInvitationsFromNotification = false

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
            } else if AuthManager.shared.isPendingDeletion {
                // Account pending deletion: show reactivation screen
                ReactivationView()
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
            if newValue && !oldValue {
                // User signed in — start invitation polling
                InvitationService.shared.startPolling()
            } else if !newValue {
                // User signed out — reset all cached state
                sidebarViewModel.reset()
                InvitationService.shared.reset()
            }
        }
        .sheet(isPresented: $showInvitationsFromNotification) {
            PendingInvitationsView {
                await sidebarViewModel.loadOrganizations()
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
            PulsingLogoLoader()

            Text("hooman.live")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(.white)
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
                DotWaveLoader(.regular)

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

            Text("Create and configure projects at hooman.live")
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

            Button("Log Out") {
                AuthManager.shared.signOut()
            }
            .foregroundStyle(.red)
            .padding(.top, 8)
        }
        .padding()
    }

    // MARK: - Authentication

    private func checkAuthentication() async {
        await AuthManager.shared.restoreSession()

        // Re-register push token after session restore
        await PushNotificationManager.shared.registerCurrentTokenIfNeeded()

        // Start invitation polling if authenticated
        if AuthManager.shared.isAuthenticated {
            InvitationService.shared.startPolling()
        }

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

        case .invitation:
            // Show pending invitations sheet
            showInvitationsFromNotification = true
            NotificationRouter.shared.clearPendingNavigation()
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
