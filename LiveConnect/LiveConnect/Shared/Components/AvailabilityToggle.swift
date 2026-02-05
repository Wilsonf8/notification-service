//
//  AvailabilityToggle.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Toggle for rep availability status.
struct AvailabilityToggle: View {
    let isAvailable: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 8) {
                Circle()
                    .fill(isAvailable ? Color.green : Color.red)
                    .frame(width: 8, height: 8)

                Text(isAvailable ? "Available" : "Unavailable")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isAvailable ? Color.green.opacity(0.2) : Color.red.opacity(0.2))
            .overlay(
                Rectangle()
                    .stroke(isAvailable ? Color.green.opacity(0.5) : Color.red.opacity(0.5), lineWidth: 1)
            )
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        VStack(spacing: 16) {
            AvailabilityToggle(isAvailable: true) {}
            AvailabilityToggle(isAvailable: false) {}
        }
    }
}
