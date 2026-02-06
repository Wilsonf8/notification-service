//
//  WaitingToTalkSection.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI
import Combine

/// Section showing pending call requests in the queue.
struct WaitingToTalkSection: View {
    let requests: [Request]
    var onAccept: (Request) -> Void
    var onDismiss: (Request) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                Image(systemName: "bell.fill")
                    .foregroundStyle(.yellow)
                Text("Waiting to Talk")
                    .font(.headline)
                    .foregroundStyle(.white)

                Spacer()

                Text("\(requests.count)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.black)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.yellow)
                    .clipShape(Capsule())
            }

            // Request cards
            ForEach(requests) { request in
                RequestCard(
                    request: request,
                    onAccept: { onAccept(request) },
                    onDismiss: { onDismiss(request) }
                )
            }
        }
    }
}

// MARK: - RequestCard

private struct RequestCard: View {
    let request: Request
    var onAccept: () -> Void
    var onDismiss: () -> Void

    @State private var timeWaiting: String = ""
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                // Visitor info
                VStack(alignment: .leading, spacing: 4) {
                    Text(request.visitor.displayName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)

                    if let page = request.visitor.currentPage {
                        Text(page)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.caption2)
                        Text(timeWaiting)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                Spacer()

                // Direction indicator
                Image(systemName: request.direction == .userToReps ? "arrow.right" : "arrow.left")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Action buttons
            HStack(spacing: 12) {
                Button(action: onDismiss) {
                    Text("Dismiss")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .glassEffect()
                        .foregroundStyle(.white)
                }

                Button(action: onAccept) {
                    HStack {
                        Image(systemName: "video.fill")
                        Text("Accept")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(.yellow)
                    .foregroundStyle(.black)
                }
            }
        }
        .padding()
        .glassEffect()
        .onAppear {
            updateTimeWaiting()
        }
        .onReceive(timer) { _ in
            updateTimeWaiting()
        }
    }

    private func updateTimeWaiting() {
        let now = Date()
        let created = request.expiresAt.addingTimeInterval(-60) // Assume 60s expiry
        let interval = now.timeIntervalSince(created)

        if interval < 60 {
            timeWaiting = "\(Int(interval))s waiting"
        } else {
            timeWaiting = "\(Int(interval / 60))m waiting"
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        WaitingToTalkSection(
            requests: [],
            onAccept: { _ in },
            onDismiss: { _ in }
        )
        .padding()
    }
}
