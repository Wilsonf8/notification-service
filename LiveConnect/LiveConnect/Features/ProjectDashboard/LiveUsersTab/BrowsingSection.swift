//
//  BrowsingSection.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Section showing online visitors not in queue or call.
struct BrowsingSection: View {
    let visitors: [Visitor]
    var onPing: (Visitor) -> Void
    var onSelect: (Visitor) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                Image(systemName: "eye.fill")
                    .foregroundStyle(.blue)
                Text("Browsing")
                    .font(.headline)
                    .foregroundStyle(.white)

                Spacer()

                Text("\(visitors.count)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.blue)
                    .clipShape(Capsule())
            }

            if visitors.isEmpty {
                emptyState
            } else {
                // Visitor cards
                ForEach(visitors) { visitor in
                    BrowsingVisitorCard(
                        visitor: visitor,
                        onPing: { onPing(visitor) },
                        onSelect: { onSelect(visitor) }
                    )
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.slash")
                .font(.title)
                .foregroundStyle(.secondary)

            Text("No visitors online")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
    }
}

// MARK: - BrowsingVisitorCard

private struct BrowsingVisitorCard: View {
    let visitor: Visitor
    var onPing: () -> Void
    var onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                // Visitor info
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(visitor.displayName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.white)

                        if visitor.isFirstVisit == true {
                            Text("NEW")
                                .font(.system(size: 9, weight: .bold, design: .monospaced))
                                .foregroundStyle(.black)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(.yellow)
                        }
                    }

                    if let page = visitor.currentPage {
                        Text(page)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    if visitor.isFirstVisit != true,
                       let previousVisitEndedAt = visitor.previousVisitEndedAt {
                        Text("Last seen \(formatRelativeTime(previousVisitEndedAt))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Ping button (always reserve space to keep consistent height)
                Button(action: onPing) {
                    Image(systemName: "bell.badge")
                        .font(.title3)
                        .foregroundStyle(.yellow)
                        .padding(8)
                        .glassEffect()
                }
                .buttonStyle(.plain)
                .opacity(visitor.isPingable ? 1 : 0)
                .disabled(!visitor.isPingable)

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .glassEffect()
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// Formats a date as relative time (e.g., "2h ago", "3d ago").
    /// - Parameter date: The date to format relative to now.
    /// - Returns: A human-readable relative time string.
    private func formatRelativeTime(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        let minutes = Int(interval / 60)
        if minutes < 1 { return "just now" }
        if minutes < 60 { return "\(minutes)m ago" }
        let hours = minutes / 60
        if hours < 24 { return "\(hours)h ago" }
        let days = hours / 24
        if days < 7 { return "\(days)d ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        BrowsingSection(
            visitors: [],
            onPing: { _ in },
            onSelect: { _ in }
        )
        .padding()
    }
}
