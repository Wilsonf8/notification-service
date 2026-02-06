//
//  RepsListView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// List view showing reps for the current project.
struct RepsListView: View {
    let reps: [Rep]

    var body: some View {
        ScrollView {
            if reps.isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: 1) {
                    ForEach(reps) { rep in
                        RepRow(rep: rep)
                    }
                }
                .padding(.vertical, 8)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.badge.key")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No reps assigned")
                .font(.headline)
                .foregroundStyle(.white)

            Text("Reps will appear here once assigned to this project")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - RepRow

private struct RepRow: View {
    let rep: Rep

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(avatarColor)
                .frame(width: 44, height: 44)
                .overlay(
                    Text(rep.name.prefix(1).uppercased())
                        .font(.headline)
                        .foregroundStyle(.white)
                )

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(rep.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)

                Text(rep.email ?? "No email")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Status indicators
            VStack(alignment: .trailing, spacing: 4) {
                // Presence
                HStack(spacing: 4) {
                    Circle()
                        .fill(presenceColor)
                        .frame(width: 8, height: 8)

                    Text(presenceText)
                        .font(.caption)
                        .foregroundStyle(presenceColor)
                }

                // Availability
                Text(rep.availability == .available ? "Available" : "Unavailable")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
    }

    private var avatarColor: Color {
        switch rep.presence {
        case .online: return .green.opacity(0.3)
        case .inCall: return .yellow.opacity(0.3)
        case .offline: return .gray.opacity(0.3)
        }
    }

    private var presenceColor: Color {
        switch rep.presence {
        case .online: return .green
        case .inCall: return .yellow
        case .offline: return .gray
        }
    }

    private var presenceText: String {
        switch rep.presence {
        case .online: return "Online"
        case .inCall: return "In Call"
        case .offline: return "Offline"
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        RepsListView(reps: [
            Rep(
                id: UUID(),
                userId: UUID(),
                name: "John Doe",
                email: "john@example.com",
                availability: .available,
                presence: .online
            ),
            Rep(
                id: UUID(),
                userId: UUID(),
                name: "Jane Smith",
                email: "jane@example.com",
                availability: .available,
                presence: .inCall
            )
        ])
    }
}
