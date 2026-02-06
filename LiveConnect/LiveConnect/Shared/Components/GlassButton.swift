//
//  GlassButton.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// A button with a liquid glass style background.
///
/// Uses iOS 26 Liquid Glass effects with proper tinting for semantic meaning:
/// - Primary: Yellow-tinted glass for call-to-action buttons
/// - Secondary: Regular glass for standard actions
/// - Destructive: Red-tinted glass for dangerous actions
struct GlassButton: View {
    let title: String
    let icon: String?
    let style: Style
    let action: () -> Void

    enum Style {
        case primary
        case secondary
        case destructive

        /// All styles use white text for contrast on translucent glass.
        var foregroundColor: Color {
            .white
        }
    }

    init(
        _ title: String,
        icon: String? = nil,
        style: Style = .primary,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon {
                    Image(systemName: icon)
                }
                Text(title)
            }
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(style.foregroundColor)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .modifier(GlassButtonStyleModifier(style: style))
        }
    }
}

/// Applies the appropriate Liquid Glass effect for GlassButton.
///
/// Uses `.interactive()` for press animation and shimmer feedback.
/// Uses `.tint()` for semantic meaning (yellow = CTA, red = danger).
private struct GlassButtonStyleModifier: ViewModifier {
    let style: GlassButton.Style

    func body(content: Content) -> some View {
        switch style {
        case .primary:
            content.glassEffect(.regular.tint(.yellow).interactive())
        case .secondary:
            content.glassEffect(.regular.interactive())
        case .destructive:
            content.glassEffect(.regular.tint(.red).interactive())
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        VStack(spacing: 16) {
            GlassButton("Accept Call", icon: "video.fill", style: .primary) {}
            GlassButton("Cancel", style: .secondary) {}
            GlassButton("End Call", icon: "phone.down.fill", style: .destructive) {}
        }
    }
}
