//
//  CrmTimeFilter.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Horizontal row of time filter pill buttons.
struct CrmTimeFilter: View {
    /// The currently selected number of days.
    @Binding var selectedDays: Int

    /// Available time range options.
    private let options = [1, 3, 7, 30]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(options, id: \.self) { days in
                Button {
                    selectedDays = days
                } label: {
                    Text("\(days)d")
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundStyle(selectedDays == days ? .black : .white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(selectedDays == days ? Color.yellow : Color.white.opacity(0.1))
                }
            }
            Spacer()
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        CrmTimeFilter(selectedDays: .constant(7))
            .padding()
    }
}
