//
//  CrmStageFilter.swift
//  LiveConnect
//

import SwiftUI

/// Horizontal row of multi-select pipeline stage filter pills.
struct CrmStageFilter: View {
    /// The currently selected stages (empty = no filter).
    @Binding var selectedStages: Set<PipelineStage>

    var body: some View {
        HStack(spacing: 8) {
            ForEach(PipelineStage.allCases, id: \.self) { stage in
                Button {
                    if selectedStages.contains(stage) {
                        selectedStages.remove(stage)
                    } else {
                        selectedStages.insert(stage)
                    }
                } label: {
                    Text(stage.label)
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundStyle(selectedStages.contains(stage) ? .black : .white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(selectedStages.contains(stage) ? Color.yellow : Color.white.opacity(0.1))
                }
            }
            Spacer()
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        CrmStageFilter(selectedStages: .constant([.engaged]))
            .padding()
    }
}
