//
//  VisitorDetailPanel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Detail panel showing visitor information.
struct VisitorDetailPanel: View {
    let visitor: Visitor
    var onPing: () -> Void

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

                        Spacer()

                        // Action buttons
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
                    }
                    .padding()
                }
            }
            .navigationTitle("Visitor Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
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
            hasActiveRequest: false
        ),
        onPing: {}
    )
}
