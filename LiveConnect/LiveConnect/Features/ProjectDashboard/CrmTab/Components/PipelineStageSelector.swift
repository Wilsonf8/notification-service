//
//  PipelineStageSelector.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// A horizontal scrollable row of tappable pipeline stage pills.
struct PipelineStageSelector: View {
    /// The currently selected stage.
    let currentStage: PipelineStage

    /// The stage currently being updated (shows loading indicator).
    let updatingStage: PipelineStage?

    /// Called when a stage is tapped.
    let onSelect: (PipelineStage) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(PipelineStage.allCases, id: \.self) { stage in
                    Button {
                        if stage != currentStage {
                            onSelect(stage)
                        }
                    } label: {
                        Group {
                            if updatingStage == stage {
                                ProgressView()
                                    .tint(stage == currentStage ? .black : .white)
                                    .controlSize(.mini)
                            } else {
                                Text(stage.label.uppercased())
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                            }
                        }
                        .foregroundStyle(stage == currentStage ? .black : .white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .frame(minWidth: 44)
                        .background(stage == currentStage ? Color.yellow : Color.white.opacity(0.1))
                    }
                    .disabled(updatingStage != nil)
                }
            }
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        PipelineStageSelector(
            currentStage: .engaged,
            updatingStage: nil,
            onSelect: { _ in }
        )
        .padding()
    }
}
