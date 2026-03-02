//
//  ShimmerRow.swift
//  LiveConnect
//
//  Created by Claude on 3/1/26.
//

import SwiftUI

/// Placeholder skeleton rows with a shimmer animation for loading states.
///
/// Displays gray rectangles that simulate content rows while data is loading.
/// - Parameter count: Number of placeholder rows to display (3 for initial load, 2 for pagination).
struct ShimmerRow: View {
    let count: Int

    init(count: Int = 3) {
        self.count = count
    }

    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<count, id: \.self) { index in
                HStack(spacing: 12) {
                    // Avatar placeholder
                    RoundedRectangle(cornerRadius: 0)
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 40, height: 40)

                    VStack(alignment: .leading, spacing: 6) {
                        // Title placeholder
                        RoundedRectangle(cornerRadius: 0)
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 14)
                            .frame(maxWidth: index % 2 == 0 ? 180 : 140)

                        // Subtitle placeholder
                        RoundedRectangle(cornerRadius: 0)
                            .fill(Color.white.opacity(0.05))
                            .frame(height: 10)
                            .frame(maxWidth: index % 2 == 0 ? 120 : 160)
                    }

                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .shimmer()
            }
        }
        .drawingGroup()
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        VStack(spacing: 24) {
            Text("Initial Load (3)")
                .foregroundStyle(.secondary)
            ShimmerRow(count: 3)

            Divider()

            Text("Pagination (2)")
                .foregroundStyle(.secondary)
            ShimmerRow(count: 2)
        }
    }
}
