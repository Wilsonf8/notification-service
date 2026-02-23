//
//  CrmNotesSection.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Displays notes with an input field and a list of existing notes.
struct CrmNotesSection: View {
    /// The list of notes.
    let notes: [VisitorNote]

    /// Whether a note is being submitted.
    let isSubmitting: Bool

    /// Whether more notes are loading.
    let isLoading: Bool

    /// Whether there are more notes to load.
    let hasMore: Bool

    /// The current rep's ID (to determine if a note is deletable).
    let currentRepId: UUID?

    /// Called when the user submits a new note.
    let onAdd: (String) -> Void

    /// Called when the user deletes a note.
    let onDelete: (UUID) -> Void

    /// Called when "Load More" is tapped.
    let onLoadMore: () -> Void

    @State private var noteText = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Input field
            HStack(spacing: 8) {
                TextField("Add a note...", text: $noteText, axis: .vertical)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .lineLimit(3)
                    .padding(8)
                    .background(Color.white.opacity(0.08))

                Button {
                    let content = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !content.isEmpty else { return }
                    noteText = ""
                    onAdd(content)
                } label: {
                    if isSubmitting {
                        ProgressView()
                            .tint(.black)
                            .controlSize(.small)
                    } else {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.yellow)
                    }
                }
                .disabled(noteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
            }

            // Notes list
            ForEach(notes) { note in
                NoteCard(
                    note: note,
                    canDelete: note.authorRepId == currentRepId,
                    onDelete: { onDelete(note.id) }
                )
            }

            // Load more
            if hasMore {
                Button("Load More") {
                    onLoadMore()
                }
                .font(.caption)
                .foregroundStyle(.yellow)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
            }

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity)
            }
        }
    }
}

// MARK: - NoteCard

/// A single note display card.
private struct NoteCard: View {
    let note: VisitorNote
    let canDelete: Bool
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(note.content)
                .font(.subheadline)
                .foregroundStyle(.white)

            HStack {
                Text("— \(note.authorName) · \(formatDate(note.createdAt))")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                if canDelete {
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .font(.caption)
                            .foregroundStyle(.red.opacity(0.7))
                    }
                }
            }
        }
        .padding(10)
        .background(Color.white.opacity(0.05))
    }

    /// Formats a date for display.
    /// - Parameter date: The date to format.
    /// - Returns: Formatted string (e.g., "Feb 20, 2:30 PM").
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }
}
