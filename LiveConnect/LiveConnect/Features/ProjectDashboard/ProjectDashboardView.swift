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
    case reps = "Reps"
    case settings = "Settings"

    var icon: String {
        switch self {
        case .liveUsers: return "person.2"
        case .conversations: return "bubble.left.and.bubble.right"
        case .reps: return "person.badge.key"
        case .settings: return "gear"
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
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                headerView

                // Connection status bar
                connectionStatusBar

                // Tab content
                TabView(selection: $selectedTab) {
                    LiveUsersView(viewModel: viewModel) { callResponse in
                        activeCall = callResponse
                    }
                    .tag(DashboardTab.liveUsers)

                    ConversationsListView(projectId: projectId)
                        .tag(DashboardTab.conversations)

                    RepsListView(reps: viewModel.reps)
                        .tag(DashboardTab.reps)

                    ProjectSettingsView(project: viewModel.project)
                        .tag(DashboardTab.settings)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                // Bottom tab bar
                tabBar
            }
        }
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
                livekitUrl: call.livekitUrl,
                livekitToken: call.livekitToken,
                projectId: projectId
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

    // MARK: - Tab Bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(DashboardTab.allCases, id: \.self) { tab in
                TabBarButton(
                    tab: tab,
                    isSelected: selectedTab == tab,
                    badgeCount: badgeCount(for: tab)
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedTab = tab
                    }
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial.opacity(0.8))
    }

    /// Returns the badge count for a tab.
    private func badgeCount(for tab: DashboardTab) -> Int {
        switch tab {
        case .liveUsers:
            return viewModel.queuedRequests.count
        default:
            return 0
        }
    }
}

// MARK: - TabBarButton

private struct TabBarButton: View {
    let tab: DashboardTab
    let isSelected: Bool
    let badgeCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: tab.icon)
                        .font(.title2)

                    if badgeCount > 0 {
                        Text("\(badgeCount)")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(.black)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(.yellow)
                            .clipShape(Capsule())
                            .offset(x: 8, y: -4)
                    }
                }

                Text(tab.rawValue)
                    .font(.caption2)
            }
            .foregroundStyle(isSelected ? .yellow : .secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
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
