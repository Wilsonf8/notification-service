//
//  CrmConversationsSection.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Displays a list of past conversations for a CRM visitor.
struct CrmConversationsSection: View {
    /// The project UUID.
    let projectId: UUID

    /// The list of conversations.
    let conversations: [Conversation]

    /// Whether conversations are loading.
    let isLoading: Bool

    /// Whether there are more conversations to load.
    let hasMore: Bool

    /// Called when "Load More" is tapped.
    let onLoadMore: () -> Void

    @State private var selectedConversation: Conversation?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(conversations) { conversation in
                CrmConversationRow(conversation: conversation) {
                    selectedConversation = conversation
                }
            }

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
                ShimmerRow(count: 2)
                    .frame(maxWidth: .infinity)
            }
        }
        .sheet(item: $selectedConversation) { conversation in
            CrmConversationChatSheet(
                projectId: projectId,
                conversation: conversation
            )
        }
    }
}

// MARK: - CrmConversationRow

/// A single conversation row.
private struct CrmConversationRow: View {
    let conversation: Conversation
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                // Type icon
                Image(systemName: conversation.type == .videoCall ? "video" : "doc.plaintext")
                    .font(.title3)
                    .foregroundStyle(.yellow)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(conversation.type == .videoCall ? "Video Call" : "Contact Form")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.white)

                    HStack(spacing: 6) {
                        if let rep = conversation.rep {
                            Text("with \(rep.name)")
                                .foregroundStyle(.secondary)
                        }

                        if let duration = conversation.formattedDuration {
                            Text("·")
                                .foregroundStyle(.secondary)
                            Text(duration)
                                .foregroundStyle(.secondary)
                        }

                        if conversation.messageCount > 0 {
                            Text("·")
                                .foregroundStyle(.secondary)
                            Text("\(conversation.messageCount) msgs")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .font(.caption)
                }

                Spacer()

                Text(conversation.startedAt, style: .date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(10)
            .background(Color.white.opacity(0.05))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
