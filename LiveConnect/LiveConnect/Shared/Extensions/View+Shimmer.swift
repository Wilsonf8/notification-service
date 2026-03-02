//
//  View+Shimmer.swift
//  LiveConnect
//
//  Created by Claude on 3/1/26.
//

import SwiftUI

extension View {
    /// Applies a shimmer sweep effect to the view.
    ///
    /// Animates a diagonal linear gradient from left to right using `.screen` blend mode.
    /// Designed for dark backgrounds with a subtle white sweep.
    func shimmer() -> some View {
        self.modifier(ShimmerModifier())
    }
}

/// A view modifier that animates a diagonal gradient sweep across its content.
private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay {
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.1), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: phase * geometry.size.width * 2)
                    .blendMode(.screen)
                }
                .clipped()
            }
            .onAppear {
                withAnimation(
                    .linear(duration: 1.5)
                    .repeatForever(autoreverses: false)
                ) {
                    phase = 1
                }
            }
    }
}
