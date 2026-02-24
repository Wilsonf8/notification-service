//
//  CrmTagFilter.swift
//  LiveConnect
//

import SwiftUI

/// Horizontally scrollable tag chip filter with toggle selection.
struct CrmTagFilter: View {
    /// Available project tags.
    let tags: [CrmTag]

    /// The currently selected tag IDs (empty = no filter).
    @Binding var selectedTagIds: Set<UUID>

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(tags) { tag in
                    Button {
                        if selectedTagIds.contains(tag.id) {
                            selectedTagIds.remove(tag.id)
                        } else {
                            selectedTagIds.insert(tag.id)
                        }
                    } label: {
                        Text(tag.name)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(
                                (Color(hex: tag.color) ?? Color.white.opacity(0.15))
                                    .opacity(selectedTagIds.contains(tag.id) ? 1.0 : 0.3)
                            )
                    }
                }
            }
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        CrmTagFilter(
            tags: [
                CrmTag(id: UUID(), name: "VIP", color: "#FF5733"),
                CrmTag(id: UUID(), name: "Follow-up", color: "#3498DB"),
            ],
            selectedTagIds: .constant([])
        )
        .padding()
    }
}
