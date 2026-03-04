//
//  VisitorDetailPanel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Detail panel showing visitor information.
struct VisitorDetailPanel: View {
    /// The visitor to display details for.
    let visitor: Visitor

    /// The project UUID, used to fetch visit data from the API.
    let projectId: UUID

    /// Callback when the ping button is tapped.
    var onPing: () -> Void

    /// Visit data loaded from the API.
    @State private var visitData: VisitorDetailResponse?

    /// Whether visit data is currently loading.
    @State private var isLoadingVisits = false

    /// Whether the block confirmation alert is shown.
    @State private var showBlockConfirmation = false

    /// Whether the block success alert is shown.
    @State private var showBlockSuccess = false

    /// Whether the report confirmation alert is shown.
    @State private var showReportConfirmation = false

    /// Whether the report success alert is shown.
    @State private var showReportSuccess = false

    /// Error message from moderation actions.
    @State private var moderationError: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Avatar
                        Circle()
                            .fill(Color.white.opacity(0.1))
                            .frame(width: 80, height: 80)
                            .overlay(
                                Text(visitor.displayName.prefix(1).uppercased())
                                    .font(.title)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                            )

                        // Name
                        VStack(spacing: 4) {
                            Text(visitor.displayName)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)

                            if let email = visitor.email {
                                Text(email)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        // Ping button
                        if visitor.isPingable {
                            Button(action: onPing) {
                                HStack {
                                    Image(systemName: "bell.badge")
                                    Text("Ping Visitor")
                                }
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(.yellow)
                                .foregroundStyle(.black)
                            }
                        }

                        // Moderation actions
                        HStack(spacing: 12) {
                            Button {
                                showReportConfirmation = true
                            } label: {
                                HStack {
                                    Image(systemName: "exclamationmark.bubble")
                                    Text("Report")
                                }
                                .font(.subheadline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.white.opacity(0.05))
                                .foregroundStyle(.orange)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                                )
                            }

                            Button {
                                showBlockConfirmation = true
                            } label: {
                                HStack {
                                    Image(systemName: "hand.raised")
                                    Text("Block")
                                }
                                .font(.subheadline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.red.opacity(0.05))
                                .foregroundStyle(.red)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                                )
                            }
                        }

                        // Details
                        VStack(spacing: 16) {
                            DetailRow(
                                icon: "globe",
                                label: "Current Page",
                                value: visitor.currentPage ?? "Unknown"
                            )

                            DetailRow(
                                icon: "wifi",
                                label: "Status",
                                value: visitor.isConnected ? "Connected" : "Disconnected"
                            )

                            DetailRow(
                                icon: "bell",
                                label: "Pingable",
                                value: visitor.isPingable ? "Yes" : "No"
                            )
                        }
                        .padding()
                        .background(Color.white.opacity(0.05))

                        // Visit Activity
                        if let stats = visitData?.stats {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("VISIT ACTIVITY")
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .foregroundStyle(.secondary)

                                HStack(spacing: 8) {
                                    StatCard(value: stats.visits24h, label: "24h")
                                    StatCard(value: stats.visits3d, label: "3 days")
                                    StatCard(value: stats.visits7d, label: "7 days")
                                }
                            }
                        }

                        // Engagement Activity
                        if let engagement = visitData?.engagement {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("ENGAGEMENT ACTIVITY")
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .foregroundStyle(.secondary)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Pings Received")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(.secondary)
                                    HStack(spacing: 8) {
                                        StatCard(value: engagement.pingsReceived24h, label: "24h")
                                        StatCard(value: engagement.pingsReceived3d, label: "3 days")
                                        StatCard(value: engagement.pingsReceived7d, label: "7 days")
                                    }
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Requests Sent")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(.secondary)
                                    HStack(spacing: 8) {
                                        StatCard(value: engagement.requestsSent24h, label: "24h")
                                        StatCard(value: engagement.requestsSent3d, label: "3 days")
                                        StatCard(value: engagement.requestsSent7d, label: "7 days")
                                    }
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Calls Joined")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(.secondary)
                                    HStack(spacing: 8) {
                                        StatCard(value: engagement.callsJoined24h, label: "24h")
                                        StatCard(value: engagement.callsJoined3d, label: "3 days")
                                        StatCard(value: engagement.callsJoined7d, label: "7 days")
                                    }
                                }
                            }
                        }

                        // Visit History
                        if let visits = visitData?.recentVisits, !visits.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("VISIT HISTORY")
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .foregroundStyle(.secondary)

                                ForEach(visits) { visit in
                                    HStack {
                                        Text(formatVisitDate(visit.startedAt))
                                            .font(.caption)
                                        Spacer()
                                        if let endedAt = visit.endedAt {
                                            Text(formatDuration(from: visit.startedAt, to: endedAt))
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        } else {
                                            Text("Active")
                                                .font(.caption)
                                                .foregroundStyle(.green)
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                            .padding()
                            .background(Color.white.opacity(0.05))
                        }

                    }
                    .padding()
                }
            }
            .navigationTitle("Visitor Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .task {
                await loadVisitData()
            }
            .alert("Report Visitor", isPresented: $showReportConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Report", role: .destructive) {
                    Task { await reportVisitor() }
                }
            } message: {
                Text("Report \(visitor.displayName) for inappropriate behavior? Our team will review it.")
            }
            .alert("Visitor Reported", isPresented: $showReportSuccess) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Thank you for your report. Our team will review it.")
            }
            .alert("Block Visitor", isPresented: $showBlockConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Block", role: .destructive) {
                    Task { await blockVisitor() }
                }
            } message: {
                Text("Block \(visitor.displayName)? They will no longer be able to initiate conversations.")
            }
            .alert("Visitor Blocked", isPresented: $showBlockSuccess) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("\(visitor.displayName) has been blocked.")
            }
            .alert("Error", isPresented: .init(
                get: { moderationError != nil },
                set: { if !$0 { moderationError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(moderationError ?? "An error occurred.")
            }
        }
    }

    /// Loads visit data from the API for this visitor.
    private func loadVisitData() async {
        isLoadingVisits = true
        defer { isLoadingVisits = false }

        do {
            let response: VisitorDetailResponse = try await APIClient.shared.get(
                Endpoints.visitorVisits(projectId: projectId, visitorId: visitor.id)
            )
            visitData = response
        } catch {
            print("Failed to load visitor visits: \(error)")
        }
    }

    /// Reports the visitor for inappropriate behavior.
    private func reportVisitor() async {
        do {
            let request = ReportVisitorRequest(reason: "Inappropriate behavior", messageContent: nil)
            try await APIClient.shared.post(
                Endpoints.reportVisitor(projectId: projectId, visitorId: visitor.id),
                body: request
            )
            showReportSuccess = true
        } catch {
            moderationError = error.localizedDescription
        }
    }

    /// Blocks the visitor from the project.
    private func blockVisitor() async {
        do {
            let request = BlockVisitorRequest(reason: nil)
            try await APIClient.shared.post(
                Endpoints.blockVisitor(projectId: projectId, visitorId: visitor.id),
                body: request
            )
            showBlockSuccess = true
        } catch {
            moderationError = error.localizedDescription
        }
    }

    /// Formats a visit start date for display.
    /// - Parameter date: The date to format.
    /// - Returns: A formatted date string (e.g., "Feb 19, 2:30 PM").
    private func formatVisitDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }

    /// Formats the duration between two dates for display.
    /// - Parameters:
    ///   - start: The start date.
    ///   - end: The end date.
    /// - Returns: A human-readable duration string (e.g., "5m", "1h 23m").
    private func formatDuration(from start: Date, to end: Date) -> String {
        let seconds = Int(end.timeIntervalSince(start))
        if seconds < 60 { return "\(seconds)s" }
        let minutes = seconds / 60
        if minutes < 60 { return "\(minutes)m" }
        let hours = minutes / 60
        let remainingMinutes = minutes % 60
        if remainingMinutes == 0 { return "\(hours)h" }
        return "\(hours)h \(remainingMinutes)m"
    }
}

// MARK: - StatCard

/// A compact card displaying a numeric stat with a label.
private struct StatCard: View {
    /// The numeric value to display.
    let value: Int

    /// The label beneath the value.
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(size: 18, weight: .semibold, design: .monospaced))
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.05))
    }
}

// MARK: - DetailRow

private struct DetailRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.secondary)
                .frame(width: 24)

            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
                .lineLimit(1)
        }
    }
}

#Preview {
    VisitorDetailPanel(
        visitor: Visitor(
            id: UUID(),
            visitorId: "abc123",
            name: "John Doe",
            email: "john@example.com",
            currentPage: "/pricing",
            isConnected: true,
            isPingable: true,
            hasActiveRequest: false,
            isFirstVisit: false,
            previousVisitEndedAt: Date().addingTimeInterval(-3600),
            totalVisitCount: 5
        ),
        projectId: UUID(),
        onPing: {}
    )
}
