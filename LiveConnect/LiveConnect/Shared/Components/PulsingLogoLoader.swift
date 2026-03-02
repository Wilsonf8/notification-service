//
//  PulsingLogoLoader.swift
//  LiveConnect
//
//  Created by Claude on 3/1/26.
//

import SwiftUI

/// A branded splash screen loader that pulses the camera icon with a yellow glow.
///
/// Gently scales the icon from 1.0 to 1.08 while fading a yellow shadow in and out.
/// Matches the existing splash screen layout in `ContentView`.
struct PulsingLogoLoader: View {
    @State private var isPulsing = false

    var body: some View {
        Image(systemName: "video.fill")
            .font(.system(size: 60))
            .foregroundStyle(.yellow)
            .scaleEffect(isPulsing ? 1.08 : 1.0)
            .shadow(
                color: .yellow.opacity(isPulsing ? 0.6 : 0.0),
                radius: isPulsing ? 20 : 0
            )
            .animation(
                .easeInOut(duration: 1.8)
                .repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear {
                isPulsing = true
            }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        VStack(spacing: 24) {
            PulsingLogoLoader()

            Text("hooman.live")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(.white)
        }
    }
}
