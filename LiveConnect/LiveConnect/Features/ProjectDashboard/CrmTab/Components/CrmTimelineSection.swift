//
//  CrmTimelineSection.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Displays a unified timeline of visitor events.
struct CrmTimelineSection: View {
    /// The list of timeline events.
    let events: [TimelineEvent]

    /// Whether more events are loading.
    let isLoading: Bool

    /// Whether there are more events to load.
    let hasMore: Bool

    /// Called when "Load More" is tapped.
    let onLoadMore: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(events) { event in
                TimelineEventRow(event: event)
            }

            if hasMore {
                Button("Load More") {
                    onLoadMore()
                }
                .font(.caption)
                .foregroundStyle(.yellow)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
        }
    }
}

// MARK: - TimelineEventRow

/// A single event in the timeline.
private struct TimelineEventRow: View {
    let event: TimelineEvent

    private var eventType: TimelineEventType {
        event.eventType ?? .visit
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Timeline line + dot
            VStack(spacing: 0) {
                Circle()
                    .fill(dotColor)
                    .frame(width: 10, height: 10)
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 1)
            }
            .frame(width: 10)

            // Content
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Image(systemName: eventType.iconName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(eventType.label.uppercased())
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(formatDate(event.timestamp))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                // Event-specific detail
                if let description = eventDescription {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.white)
                }
            }
            .padding(.vertical, 8)
        }
    }

    /// The color for the timeline dot.
    private var dotColor: Color {
        switch eventType {
        case .call: return .yellow
        case .contactForm: return .blue
        case .note: return .purple
        case .request: return .orange
        case .visit: return .green
        case .pageView: return .cyan
        }
    }

    /// A description extracted from the event data.
    private var eventDescription: String? {
        let data = event.data
        switch eventType {
        case .visit:
            let page = data["currentPage"]?.stringValue
            let duration = data["durationSeconds"]?.intValue
            var parts: [String] = []
            if let page { parts.append(page) }
            if let duration { parts.append("(\(formatDuration(duration)))") }
            return parts.isEmpty ? nil : parts.joined(separator: " ")
        case .pageView:
            return data["page"]?.stringValue ?? data["currentPage"]?.stringValue
        case .call:
            let repName = data["repName"]?.stringValue
            let duration = data["durationSeconds"]?.intValue
            var parts: [String] = []
            if let repName { parts.append("with \(repName)") }
            if let duration { parts.append("(\(formatDuration(duration)))") }
            return parts.isEmpty ? nil : parts.joined(separator: " ")
        case .contactForm:
            return data["repName"]?.stringValue.map { "with \($0)" }
        case .note:
            return data["content"]?.stringValue
        case .request:
            return data["direction"]?.stringValue
        }
    }

    /// Formats a date for display.
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }

    /// Formats seconds into a readable duration.
    private func formatDuration(_ seconds: Int) -> String {
        if seconds < 60 { return "\(seconds)s" }
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        if minutes < 60 { return "\(minutes)m \(remainingSeconds)s" }
        let hours = minutes / 60
        let remainingMinutes = minutes % 60
        return "\(hours)h \(remainingMinutes)m"
    }
}
