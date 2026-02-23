//
//  CrmConversationChatSheet.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Response wrapper for paginated messages.
private struct CrmMessageListResponse: Codable {
    let messages: [Message]
}

/// Sheet displaying chat history for a conversation.
struct CrmConversationChatSheet: View {
    /// The project UUID.
    let projectId: UUID

    /// The conversation to display.
    let conversation: Conversation

    @State private var messages: [Message] = []
    @State private var isLoading = false
    @State private var error: Error?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if isLoading && messages.isEmpty {
                    ProgressView()
                        .tint(.white)
                } else if let error, messages.isEmpty {
                    errorView(error)
                } else if messages.isEmpty {
                    emptyState
                } else {
                    messagesList
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(conversation.type == .videoCall ? "Video Call" : "Contact Form")
                            .font(.headline)

                        HStack(spacing: 6) {
                            if let rep = conversation.rep {
                                Text("Rep: \(rep.name)")
                            }
                            if let duration = conversation.formattedDuration {
                                Text("· \(duration)")
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
                // Header
                VStack(spacing: 8) {
                    Image(systemName: conversation.type == .videoCall ? "video.fill" : "doc.plaintext.fill")
                        .font(.title2)
                        .foregroundStyle(.yellow)

                    Text(conversation.startedAt, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white.opacity(0.05))

                // Messages
                ForEach(messages) { message in
                    CrmChatMessageRow(message: message)
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

            Text("This conversation had no chat messages")
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
                Task { await loadMessages() }
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
            let response: CrmMessageListResponse = try await APIClient.shared.get(
                Endpoints.messages(projectId: projectId, conversationId: conversation.id)
            )
            messages = response.messages
        } catch {
            self.error = error
        }

        isLoading = false
    }
}

// MARK: - CrmChatMessageRow

/// A chat message row, replicating the pattern from ConversationDetailView.
private struct CrmChatMessageRow: View {
    let message: Message

    private var isFromRep: Bool {
        message.senderType == .rep
    }

    private var isSystem: Bool {
        message.senderType == .system
    }

    var body: some View {
        if isSystem {
            Text(message.content)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        } else {
            HStack(alignment: .top) {
                if isFromRep { Spacer(minLength: 60) }

                VStack(alignment: isFromRep ? .trailing : .leading, spacing: 4) {
                    if let senderName = message.senderName {
                        Text(senderName)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                    }

                    Text(message.content)
                        .font(.body)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(isFromRep ? Color.yellow : Color.white.opacity(0.15))
                        .foregroundStyle(isFromRep ? .black : .white)

                    Text(message.createdAt ?? Date(), style: .time)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if !isFromRep { Spacer(minLength: 60) }
            }
        }
    }
}
