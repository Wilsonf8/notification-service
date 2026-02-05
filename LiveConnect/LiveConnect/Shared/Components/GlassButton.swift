//
//  GlassButton.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// A button with a liquid glass style background.
struct GlassButton: View {
    let title: String
    let icon: String?
    let style: Style
    let action: () -> Void

    enum Style {
        case primary
        case secondary
        case destructive

        var backgroundColor: Color {
            switch self {
            case .primary: return .yellow
            case .secondary: return .white.opacity(0.1)
            case .destructive: return .red.opacity(0.8)
            }
        }

        var foregroundColor: Color {
            switch self {
            case .primary: return .black
            case .secondary: return .white
            case .destructive: return .white
            }
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
            .background(style.backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 0))
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
