//
//  ConversationsListView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// List view showing past conversations.
struct ConversationsListView: View {
    let projectId: UUID

    @State private var conversations: [Conversation] = []
    @State private var isLoading = false
    @State private var error: Error?
    @State private var selectedConversation: Conversation?

    /// Current page for pagination.
    @State private var currentPage = 0
    private let pageSize = 20

    /// Whether there are more pages to load.
    @State private var hasMore = true

    var body: some View {
        ZStack {
            if isLoading && conversations.isEmpty {
                ProgressView()
                    .tint(.white)
            } else if let error, conversations.isEmpty {
                errorView(error)
            } else if conversations.isEmpty {
                emptyState
            } else {
                conversationList
            }
        }
        .task {
            await loadConversations()
        }
        .sheet(item: $selectedConversation) { conversation in
            ConversationDetailView(
                projectId: projectId,
                conversation: conversation
            )
        }
    }

    // MARK: - Subviews

    private var conversationList: some View {
        ScrollView {
            LazyVStack(spacing: 1) {
                ForEach(conversations) { conversation in
                    ConversationRow(conversation: conversation) {
                        selectedConversation = conversation
                    }
                    .onAppear {
                        // Load more when reaching near the end
                        if conversation.id == conversations.last?.id && hasMore {
                            Task {
                                await loadMoreConversations()
                            }
                        }
                    }
                }

                if isLoading && !conversations.isEmpty {
                    ProgressView()
                        .tint(.white)
                        .padding()
                }
            }
            .padding(.vertical, 8)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No conversations yet")
                .font(.headline)
                .foregroundStyle(.white)

            Text("Past video calls will appear here")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.yellow)

            Text("Failed to load conversations")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task {
                    await loadConversations()
                }
            }
            .buttonStyle(.bordered)
            .tint(.yellow)
        }
        .padding()
    }

    // MARK: - Data Loading

    private func loadConversations() async {
        isLoading = true
        error = nil
        currentPage = 0

        do {
            let response: [Conversation] = try await APIClient.shared.get(
                Endpoints.conversations(projectId: projectId),
                queryItems: [
                    URLQueryItem(name: "page", value: "0"),
                    URLQueryItem(name: "size", value: String(pageSize))
                ]
            )
            conversations = response
            hasMore = response.count == pageSize
        } catch {
            self.error = error
        }

        isLoading = false
    }

    private func loadMoreConversations() async {
        guard !isLoading && hasMore else { return }

        isLoading = true
        currentPage += 1

        do {
            let response: [Conversation] = try await APIClient.shared.get(
                Endpoints.conversations(projectId: projectId),
                queryItems: [
                    URLQueryItem(name: "page", value: String(currentPage)),
                    URLQueryItem(name: "size", value: String(pageSize))
                ]
            )
            conversations.append(contentsOf: response)
            hasMore = response.count == pageSize
        } catch {
            currentPage -= 1 // Revert on failure
        }

        isLoading = false
    }
}

// MARK: - ConversationRow

private struct ConversationRow: View {
    let conversation: Conversation
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                // Status indicator
                Circle()
                    .fill(conversation.status == .active ? Color.green : Color.secondary)
                    .frame(width: 10, height: 10)

                VStack(alignment: .leading, spacing: 4) {
                    // Visitor name
                    Text(conversation.visitor.displayName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.white)

                    // Rep name and duration
                    HStack(spacing: 8) {
                        if let rep = conversation.rep {
                            Text("with \(rep.name)")
                                .foregroundStyle(.secondary)
                        }

                        if let duration = conversation.formattedDuration {
                            Text("•")
                                .foregroundStyle(.secondary)
                            Text(duration)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .font(.caption)
                }

                Spacer()

                // Date and message count
                VStack(alignment: .trailing, spacing: 4) {
                    Text(conversation.startedAt, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if conversation.messageCount > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "bubble.left")
                                .font(.caption2)
                            Text("\(conversation.messageCount)")
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(Color.white.opacity(0.05))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        ConversationsListView(projectId: UUID())
    }
}
