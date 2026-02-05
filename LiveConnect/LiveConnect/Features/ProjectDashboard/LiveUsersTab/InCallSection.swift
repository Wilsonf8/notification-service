//
//  InCallSection.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI
import Combine

/// Section showing active calls.
struct InCallSection: View {
    let calls: [ActiveCall]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                Image(systemName: "video.fill")
                    .foregroundStyle(.green)
                Text("In Call")
                    .font(.headline)
                    .foregroundStyle(.white)

                Spacer()

                Text("\(calls.count)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.green)
                    .clipShape(Capsule())
            }

            // Call cards
            ForEach(calls) { call in
                ActiveCallCard(call: call)
            }
        }
    }
}

// MARK: - ActiveCallCard

private struct ActiveCallCard: View {
    let call: ActiveCall

    @State private var duration: String = ""
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack {
            // Call info
            VStack(alignment: .leading, spacing: 4) {
                Text(call.visitorName ?? "Visitor")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)

                HStack(spacing: 4) {
                    Text("with")
                        .foregroundStyle(.secondary)
                    Text(call.repName)
                        .foregroundStyle(.white)
                }
                .font(.caption)
            }

            Spacer()

            // Duration
            HStack(spacing: 4) {
                Circle()
                    .fill(.green)
                    .frame(width: 8, height: 8)

                Text(duration)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)
                    .monospacedDigit()
            }
        }
        .padding()
        .background(Color.green.opacity(0.1))
        .overlay(
            Rectangle()
                .stroke(Color.green.opacity(0.3), lineWidth: 1)
        )
        .onAppear {
            updateDuration()
        }
        .onReceive(timer) { _ in
            updateDuration()
        }
    }

    private func updateDuration() {
        let interval = Date().timeIntervalSince(call.startedAt)
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        duration = String(format: "%d:%02d", minutes, seconds)
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        InCallSection(calls: [])
            .padding()
    }
}
