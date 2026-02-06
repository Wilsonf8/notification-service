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
                    Text(visitor.displayName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.white)

                    if let page = visitor.currentPage {
                        Text(page)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
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
