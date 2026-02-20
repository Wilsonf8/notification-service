//
//  LiveUsersView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Sections within the Live Users tab.
enum LiveUsersSection: String, CaseIterable {
    case browsing = "Browsing"
    case waiting = "Waiting"
    case inCall = "In Call"
}

/// Live Users tab showing waiting, in-call, and browsing visitors.
struct LiveUsersView: View {
    @Bindable var viewModel: ProjectDashboardViewModel
    var onJoinCall: (AcceptedCallResponse) -> Void

    @State private var selectedSection: LiveUsersSection = .browsing
    @State private var selectedVisitor: Visitor?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 24) {
                    switch selectedSection {
                    case .browsing:
                        BrowsingSection(
                            visitors: viewModel.browsingVisitors,
                            onPing: { visitor in
                                Task {
                                    await viewModel.pingVisitor(visitor.id)
                                }
                            },
                            onSelect: { visitor in
                                selectedVisitor = visitor
                            }
                        )

                    case .waiting:
                        WaitingToTalkSection(
                            requests: viewModel.queuedRequests,
                            onAccept: { request in
                                Task {
                                    if let response = await viewModel.acceptRequest(request.id) {
                                        onJoinCall(response)
                                    }
                                }
                            },
                            onDismiss: { request in
                                Task {
                                    await viewModel.dismissRequest(request.id)
                                }
                            }
                        )

                    case .inCall:
                        InCallSection(calls: viewModel.activeCalls)
                    }
                }
                .padding(.horizontal)
            }
            .contentMargins(.top, -12, for: .scrollContent)
            .refreshable {
                await viewModel.refresh()
            }
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("Section", selection: $selectedSection) {
                        sectionLabel(.browsing, count: viewModel.browsingVisitors.count)
                        sectionLabel(.waiting, count: viewModel.queuedRequests.count)
                        sectionLabel(.inCall, count: viewModel.activeCalls.count)
                    }
                    .pickerStyle(.segmented)
                }
            }
            .onChange(of: NotificationRouter.shared.pendingNavigation) { _, _ in
                handlePendingVisitorNavigation()
            }
            .onChange(of: viewModel.browsingVisitors) { _, _ in
                handlePendingVisitorNavigation()
            }
            .sheet(item: $selectedVisitor) { visitor in
                VisitorDetailPanel(
                    visitor: visitor,
                    projectId: viewModel.project?.id ?? UUID(),
                    onPing: {
                        Task {
                            await viewModel.pingVisitor(visitor.id)
                        }
                        selectedVisitor = nil
                    }
                )
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
            }
        }
    }

    /// Checks for a pending visitor detail navigation and opens the sheet if the visitor is found.
    private func handlePendingVisitorNavigation() {
        guard case .visitorDetail(_, let visitorId) = NotificationRouter.shared.pendingNavigation else { return }

        if let visitor = viewModel.browsingVisitors.first(where: { $0.id == visitorId }) {
            selectedSection = .browsing
            selectedVisitor = visitor
            NotificationRouter.shared.clearPendingNavigation()
        }
    }

    /// Creates a label for a section with an optional count badge.
    /// - Parameters:
    ///   - section: The section to create a label for.
    ///   - count: The number of items in the section.
    /// - Returns: A text view with the section label.
    @ViewBuilder
    private func sectionLabel(_ section: LiveUsersSection, count: Int) -> some View {
        if count > 0 {
            Text("\(section.rawValue) (\(count))").tag(section)
        } else {
            Text(section.rawValue).tag(section)
        }
    }
}

#Preview {
    LiveUsersView(
        viewModel: ProjectDashboardViewModel(),
        onJoinCall: { _ in }
    )
}
