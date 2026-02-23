//
//  CrmEngagementStats.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Displays engagement statistics in a grid: visits, requests, calls across time windows.
struct CrmEngagementStats: View {
    /// Visit statistics.
    let visitStats: VisitorVisitStats

    /// Engagement statistics.
    let engagementStats: VisitorEngagementStats

    var body: some View {
        VStack(spacing: 12) {
            // Header row
            HStack(spacing: 0) {
                Text("")
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("24h")
                    .frame(width: 50)
                Text("3d")
                    .frame(width: 50)
                Text("7d")
                    .frame(width: 50)
            }
            .font(.system(size: 10, weight: .bold, design: .monospaced))
            .foregroundStyle(.secondary)

            // Visits row
            statsRow(
                label: "Visits",
                values: [visitStats.visits24h, visitStats.visits3d, visitStats.visits7d]
            )

            // Requests row
            statsRow(
                label: "Requests",
                values: [
                    engagementStats.requestsSent24h,
                    engagementStats.requestsSent3d,
                    engagementStats.requestsSent7d
                ]
            )

            // Calls row
            statsRow(
                label: "Calls",
                values: [
                    engagementStats.callsJoined24h,
                    engagementStats.callsJoined3d,
                    engagementStats.callsJoined7d
                ]
            )
        }
    }

    /// Renders a single stats row.
    private func statsRow(label: String, values: [Int]) -> some View {
        HStack(spacing: 0) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)

            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                Text("\(value)")
                    .font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.white)
                    .frame(width: 50)
            }
        }
        .padding(.vertical, 6)
        .background(Color.white.opacity(0.03))
    }
}
