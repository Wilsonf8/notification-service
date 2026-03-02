//
//  ConversationDetailView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Response wrapper for paginated messages.
private struct MessageListResponse: Codable {
    let messages: [Message]
}

/// Detail view showing a conversation's messages.
struct ConversationDetailView: View {
    let projectId: UUID
    let conversation: Conversation

    @State private var messages: [Message] = []
    @State private var isLoading = false
    @State private var error: Error?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if isLoading && messages.isEmpty {
                    ShimmerRow(count: 3)
                } else if let error, messages.isEmpty {
                    errorView(error)
                } else if messages.isEmpty {
                    emptyState
                } else {
                    messagesList
                }
            }
            .navigationTitle(conversation.visitor.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(conversation.visitor.displayName)
                            .font(.headline)

                        if let duration = conversation.formattedDuration {
                            Text("Duration: \(duration)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .task {
            await loadMessages()
        }
    }

    // MARK: - Subviews

    private var messagesList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Call info header
                VStack(spacing: 8) {
                    Image(systemName: "video.fill")
                        .font(.title2)
                        .foregroundStyle(.yellow)

                    Text("Video Call")
                        .font(.headline)
                        .foregroundStyle(.white)

                    Text(conversation.startedAt, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let rep = conversation.rep {
                        Text("Rep: \(rep.name)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white.opacity(0.05))

                // Messages
                ForEach(messages) { message in
                    MessageRow(message: message)
                }
            }
            .padding()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No messages")
                .font(.headline)
                .foregroundStyle(.white)

            Text("This call had no chat messages")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.yellow)

            Text("Failed to load messages")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)

            Button("Retry") {
                Task {
                    await loadMessages()
                }
            }
            .buttonStyle(.bordered)
            .tint(.yellow)
        }
        .padding()
    }

    // MARK: - Data Loading

    private func loadMessages() async {
        isLoading = true
        error = nil

        do {
            let response: MessageListResponse = try await APIClient.shared.get(
                Endpoints.messages(projectId: projectId, conversationId: conversation.id)
            )
            messages = response.messages
        } catch {
            self.error = error
        }

        isLoading = false
    }
}

// MARK: - MessageRow

private struct MessageRow: View {
    let message: Message

    private var isFromRep: Bool {
        message.senderType == .rep
    }

    private var isSystem: Bool {
        message.senderType == .system
    }

    var body: some View {
        if isSystem {
            // System message (centered)
            Text(message.content)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        } else {
            HStack(alignment: .top) {
                if isFromRep { Spacer(minLength: 60) }

                VStack(alignment: isFromRep ? .trailing : .leading, spacing: 4) {
                    // Sender name
                    if let senderName = message.senderName {
                        Text(senderName)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                    }

                    // Message bubble
                    Text(message.content)
                        .font(.body)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(isFromRep ? Color.yellow : Color.white.opacity(0.15))
                        .foregroundStyle(isFromRep ? .black : .white)

                    // Timestamp
                    Text(message.createdAt ?? Date(), style: .time)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if !isFromRep { Spacer(minLength: 60) }
            }
        }
    }
}

#Preview {
    ConversationDetailView(
        projectId: UUID(),
        conversation: Conversation(
            id: UUID(),
            visitor: Visitor(
                id: UUID(),
                visitorId: "abc123",
                name: "John Doe",
                email: "john@example.com",
                currentPage: nil,
                isConnected: false,
                isPingable: false,
                hasActiveRequest: false
            ),
            rep: nil,
            type: .videoCall,
            status: .ended,
            callDurationSeconds: 325,
            startedAt: Date().addingTimeInterval(-3600),
            endedAt: Date().addingTimeInterval(-3275),
            messageCount: 5
        )
    )
}
