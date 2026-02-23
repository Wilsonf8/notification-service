//
//  CrmTagsSection.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Displays visitor tags as removable chips with an add picker.
struct CrmTagsSection: View {
    /// Tags currently assigned to the visitor.
    let tags: [CrmTag]

    /// All project tags (for the picker).
    let projectTags: [CrmTag]

    /// Whether a tag operation is in progress.
    let isUpdating: Bool

    /// Called when a tag should be added.
    let onAdd: (UUID) -> Void

    /// Called when a tag should be removed.
    let onRemove: (UUID) -> Void

    /// Tags available to add (not already assigned).
    private var availableTags: [CrmTag] {
        let assignedIds = Set(tags.map(\.id))
        return projectTags.filter { !assignedIds.contains($0.id) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Tag chips
            FlowLayout(spacing: 6) {
                ForEach(tags) { tag in
                    HStack(spacing: 4) {
                        Text(tag.name)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.white)

                        Button {
                            onRemove(tag.id)
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(.white.opacity(0.7))
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(hex: tag.color) ?? Color.white.opacity(0.15))
                }
            }

            // Add tag picker
            if !availableTags.isEmpty {
                Menu {
                    ForEach(availableTags) { tag in
                        Button(tag.name) {
                            onAdd(tag.id)
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 10, weight: .bold))
                        Text("Add tag")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.08))
                }
                .disabled(isUpdating)
            }
        }
    }
}

// MARK: - FlowLayout

/// A layout that wraps children to the next line when they exceed available width.
struct FlowLayout: Layout {
    /// Spacing between items.
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            totalWidth = max(totalWidth, currentX - spacing)
        }

        return (CGSize(width: totalWidth, height: currentY + lineHeight), positions)
    }
}
