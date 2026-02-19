//
//  VisitorVisit.swift
//  LiveConnect
//
//  Created by Claude on 2/19/26.
//

import Foundation

/// A single visitor visit (browsing session).
struct VisitorVisit: Codable, Identifiable {
    /// Unique identifier for the visit.
    let id: String

    /// When the visit started.
    let startedAt: Date

    /// When the visit ended. Nil if the visit is still active.
    let endedAt: Date?

    /// Duration of the visit in seconds. Nil if the visit is still active.
    let durationSeconds: Int?
}

/// Visit statistics across time windows.
struct VisitorVisitStats: Codable {
    /// Number of visits in the last 24 hours.
    let visits24h: Int

    /// Number of visits in the last 3 days.
    let visits3d: Int

    /// Number of visits in the last 7 days.
    let visits7d: Int

    /// Total number of visits across all time.
    let total: Int
}

/// Response from the visitor visits API endpoint.
struct VisitorDetailResponse: Codable {
    /// Aggregated visit statistics.
    let stats: VisitorVisitStats

    /// List of recent visits for the current page.
    let recentVisits: [VisitorVisit]

    /// Total number of visits across all pages.
    let totalVisits: Int

    /// Total number of pages in the paginated response.
    let totalPages: Int
}
