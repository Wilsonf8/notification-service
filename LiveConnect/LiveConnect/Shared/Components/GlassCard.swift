//
//  GlassCard.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// A card container with a liquid glass style.
struct GlassCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding()
            .glassCard()
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("Card Title")
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("Card content goes here")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}
