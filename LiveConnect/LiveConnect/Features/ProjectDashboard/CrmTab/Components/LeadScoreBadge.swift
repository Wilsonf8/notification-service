//
//  LeadScoreBadge.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// A colored badge displaying a lead score.
/// Green for >=70, yellow for 40-69, red for <40.
struct LeadScoreBadge: View {
    /// The lead score value (0-100).
    let score: Int

    /// The color based on score threshold.
    private var scoreColor: Color {
        if score >= 70 { return .green }
        if score >= 40 { return .yellow }
        return .red
    }

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(scoreColor)
                .frame(width: 8, height: 8)
            Text("\(score)")
                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                .foregroundStyle(.white)
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        VStack(spacing: 12) {
            LeadScoreBadge(score: 85)
            LeadScoreBadge(score: 52)
            LeadScoreBadge(score: 18)
        }
    }
}
