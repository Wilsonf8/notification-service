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
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .glassEffect(.regular.tint(.yellow))
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
        HStack {
            // Left: Visitor info
            VStack(alignment: .leading, spacing: 4) {
                Text(request.visitor.displayName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption2)
                    Text(timeWaiting)
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }

            Spacer()

            // Right: Action buttons (icon-only)
            HStack(spacing: 12) {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .frame(width: 36, height: 36)
                        .glassEffect(.regular.interactive())
                }

                Button(action: onAccept) {
                    Image(systemName: "video.fill")
                        .font(.body)
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .glassEffect(.regular.tint(.yellow).interactive())
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .glassEffect()
        .onAppear {
            updateTimeWaiting()
        }
        .onReceive(timer) { _ in
            updateTimeWaiting()
        }
    }

    private func updateTimeWaiting() {
        let remaining = request.expiresAt.timeIntervalSinceNow
        if remaining > 0 {
            timeWaiting = "\(Int(remaining))s left"
        } else {
            timeWaiting = "Expired"
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
