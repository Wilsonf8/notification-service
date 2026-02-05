//
//  View+Glass.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

extension View {
    /// Applies a glass background effect to the view.
    func glassBackground() -> some View {
        self.modifier(GlassBackgroundModifier())
    }

    /// Applies a glass card style to the view.
    func glassCard() -> some View {
        self.modifier(GlassCardModifier())
    }
}

// MARK: - GlassBackgroundModifier

private struct GlassBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial.opacity(0.8))
    }
}

// MARK: - GlassCardModifier

private struct GlassCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial.opacity(0.6))
            .overlay(
                Rectangle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}
