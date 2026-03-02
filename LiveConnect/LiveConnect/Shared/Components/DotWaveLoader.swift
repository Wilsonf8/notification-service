//
//  DotWaveLoader.swift
//  LiveConnect
//
//  Created by Claude on 3/1/26.
//

import SwiftUI

/// A three-dot wave animation loader with sequential scaling and opacity.
///
/// Provides two sizes for different contexts:
/// - `.regular`: 8pt dots for full-screen loading states paired with text labels.
/// - `.compact`: 4pt dots for buttons and inline indicators.
struct DotWaveLoader: View {
    /// The display size of the loader.
    enum Size {
        case regular
        case compact

        var dotSize: CGFloat {
            switch self {
            case .regular: return 8
            case .compact: return 4
            }
        }

        var spacing: CGFloat {
            switch self {
            case .regular: return 6
            case .compact: return 3
            }
        }
    }

    let size: Size

    init(_ size: Size = .regular) {
        self.size = size
    }

    var body: some View {
        HStack(spacing: size.spacing) {
            ForEach(0..<3, id: \.self) { index in
                DotView(
                    dotSize: size.dotSize,
                    delay: Double(index) * 0.15
                )
            }
        }
    }
}

/// A single animated dot that scales and fades in a loop.
private struct DotView: View {
    let dotSize: CGFloat
    let delay: Double

    @State private var isAnimating = false

    var body: some View {
        Circle()
            .fill(Color.yellow)
            .frame(width: dotSize, height: dotSize)
            .scaleEffect(isAnimating ? 1.0 : 0.4)
            .opacity(isAnimating ? 1.0 : 0.3)
            .animation(
                .easeInOut(duration: 0.6)
                .repeatForever(autoreverses: true)
                .delay(delay),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
            }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        VStack(spacing: 32) {
            VStack(spacing: 16) {
                DotWaveLoader(.regular)
                Text("Loading...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack {
                Text("Compact:")
                    .foregroundStyle(.secondary)
                DotWaveLoader(.compact)
            }
        }
    }
}
