//
//  CrmSortPicker.swift
//  LiveConnect
//

import SwiftUI

/// Sort field menu with direction toggle for the CRM visitor list.
struct CrmSortPicker: View {
    /// The currently selected sort field.
    @Binding var sortField: CrmSortField

    /// Whether the sort direction is ascending.
    @Binding var ascending: Bool

    var body: some View {
        HStack(spacing: 8) {
            Spacer()

            Menu {
                ForEach(CrmSortField.allCases, id: \.self) { field in
                    Button {
                        sortField = field
                    } label: {
                        HStack {
                            Text(field.label)
                            if sortField == field {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.system(size: 11))
                    Text(sortField.label)
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                }
                .foregroundStyle(.black)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color.yellow)
            }

            Button {
                ascending.toggle()
            } label: {
                Image(systemName: ascending ? "arrow.up" : "arrow.down")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.1))
            }
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        CrmSortPicker(sortField: .constant(.lastSeenAt), ascending: .constant(false))
            .padding()
    }
}
