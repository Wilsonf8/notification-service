//
//  LiveUsersView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Live Users tab showing waiting, in-call, and browsing visitors.
struct LiveUsersView: View {
    @Bindable var viewModel: ProjectDashboardViewModel
    var onJoinCall: (AcceptedCallResponse) -> Void

    @State private var selectedVisitor: Visitor?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 24) {
                // Waiting to Talk section
                if !viewModel.queuedRequests.isEmpty {
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
                }

                // In Call section
                if !viewModel.activeCalls.isEmpty {
                    InCallSection(calls: viewModel.activeCalls)
                }

                // Browsing section
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
            }
            .padding()
        }
        .sheet(item: $selectedVisitor) { visitor in
            VisitorDetailPanel(
                visitor: visitor,
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

#Preview {
    LiveUsersView(
        viewModel: ProjectDashboardViewModel(),
        onJoinCall: { _ in }
    )
}
