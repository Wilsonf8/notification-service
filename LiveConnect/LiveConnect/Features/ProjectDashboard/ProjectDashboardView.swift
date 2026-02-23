//
//  ProjectDashboardView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// The selected tab in the dashboard.
enum DashboardTab: String, CaseIterable {
    case liveUsers = "Live Users"
    case conversations = "Conversations"
    case crm = "CRM"
    case reps = "Reps"
    case settings = "Settings"

    var icon: String {
        switch self {
        case .liveUsers: return "person.2.fill"
        case .conversations: return "bubble.left.and.bubble.right.fill"
        case .crm: return "person.text.rectangle"
        case .reps: return "person.badge.key.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

/// Main dashboard view for a project.
struct ProjectDashboardView: View {
    let projectId: UUID
    @Bindable var sidebarViewModel: OrganizationSidebarViewModel

    @State private var viewModel = ProjectDashboardViewModel()
    @State private var selectedTab: DashboardTab = .liveUsers
    @State private var showSidebar = false
    @State private var showAccountSheet = false
    @State private var activeCall: AcceptedCallResponse?

    var body: some View {
        Group {
            if viewModel.currentRep == nil && !viewModel.isLoading && viewModel.project != nil {
                notRepView
            } else {
                dashboardTabView
                    .tabBarMinimizeBehavior(.onScrollDown)
            }
        }
        .tint(.yellow)
            .sheet(isPresented: $showSidebar) {
                OrganizationSidebarView(
                    viewModel: sidebarViewModel,
                    isPresented: $showSidebar
                )
            }
            .sheet(isPresented: $showAccountSheet) {
                AccountSheetView()
            }
            .fullScreenCover(item: $activeCall) { call in
                VideoCallView(
                    conversationId: call.conversationId,
                    livekitUrl: call.liveKitUrl,
                    livekitToken: call.token,
                    projectId: projectId,
                    webSocketManager: viewModel.webSocketManager
                ) {
                    activeCall = nil
                }
            }
            .task {
                await viewModel.loadDashboard(projectId: projectId)
            }
            .onDisappear {
                viewModel.disconnect()
            }
            .onChange(of: sidebarViewModel.selectedProjectId) { _, newProjectId in
                if let newProjectId, newProjectId != projectId {
                    Task {
                        await viewModel.loadDashboard(projectId: newProjectId)
                    }
                }
            }
            .onChange(of: viewModel.incomingCall) { _, newCall in
                if let call = newCall {
                    activeCall = call
                    viewModel.clearIncomingCall()
                }
            }
            .onChange(of: NotificationRouter.shared.pendingNavigation) { _, navigation in
                if case .conversationDetail = navigation {
                    selectedTab = .conversations
                }
            }
    }

    // MARK: - Dashboard Tab View

    private var dashboardTabView: some View {
        TabView(selection: $selectedTab) {
            Tab(DashboardTab.liveUsers.rawValue, systemImage: DashboardTab.liveUsers.icon, value: .liveUsers) {
                tabContent {
                    LiveUsersView(viewModel: viewModel) { callResponse in
                        activeCall = callResponse
                    }
                }
            }
            .badge(viewModel.queuedRequests.count)

            Tab(DashboardTab.conversations.rawValue, systemImage: DashboardTab.conversations.icon, value: .conversations) {
                tabContent {
                    ConversationsListView(projectId: projectId)
                }
            }

            Tab(DashboardTab.crm.rawValue, systemImage: DashboardTab.crm.icon, value: .crm) {
                tabContent {
                    CrmVisitorListView(projectId: projectId, reps: viewModel.reps)
                }
            }

            Tab(DashboardTab.reps.rawValue, systemImage: DashboardTab.reps.icon, value: .reps) {
                tabContent {
                    RepsListView(reps: viewModel.reps)
                }
            }

            Tab(DashboardTab.settings.rawValue, systemImage: DashboardTab.settings.icon, value: .settings) {
                tabContent {
                    ProjectSettingsView(project: viewModel.project)
                }
            }
        }
    }

    // MARK: - Tab Content Wrapper

    /// Wraps tab content with the header and connection status bar.
    @ViewBuilder
    private func tabContent<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) {
            headerView
            connectionStatusBar
            content()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color.black)
    }

    // MARK: - Header

    private var headerView: some View {
        HStack {
            // Sidebar button
            Button {
                showSidebar = true
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .glassBackground()
            }

            Spacer()

            // Project info
            VStack(spacing: 2) {
                Text(viewModel.project?.name ?? "Loading...")
                    .font(.headline)
                    .foregroundStyle(.white)

                if let description = viewModel.project?.description {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Account button
            Button {
                showAccountSheet = true
            } label: {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .glassBackground()
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    // MARK: - Not a Rep View

    /// Shown when the user is an org member but not a rep in this project.
    private var notRepView: some View {
        VStack(spacing: 0) {
            headerView
            Spacer()
            VStack(spacing: 16) {
                Image(systemName: "person.badge.key.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
                Text("You're not a rep in this project")
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("Ask a project admin to add you as a rep.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .background(Color.black)
    }

    // MARK: - Connection Status Bar

    private var connectionStatusBar: some View {
        HStack {
            // Connection status
            ConnectionStatusBadge(isConnected: viewModel.isConnected)

            Spacer()

            // Availability toggle
            AvailabilityToggle(isAvailable: viewModel.isAvailable) {
                Task {
                    await viewModel.toggleAvailability()
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

}

// MARK: - AcceptedCallResponse Extension

extension AcceptedCallResponse: Identifiable {
    var id: UUID { conversationId }
}

#Preview {
    ProjectDashboardView(
        projectId: UUID(),
        sidebarViewModel: OrganizationSidebarViewModel()
    )
}
