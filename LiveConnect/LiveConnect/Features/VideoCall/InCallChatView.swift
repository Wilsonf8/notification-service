//
//  InCallChatView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Chat panel overlay during a video call.
struct InCallChatView: View {
    let messages: [Message]
    var onSend: (String) -> Void
    var onClose: () -> Void

    @State private var messageText = ""
    @State private var dragOffset: CGFloat = 0

    /// Compact drag tab on the left edge for dismissing the chat panel.
    private var dragHandle: some View {
        Capsule()
            .fill(Color.white.opacity(0.35))
            .frame(width: 5, height: 44)
            .frame(width: 24, height: 80)
            .contentShape(Rectangle())
            .offset(x: -12)
            .highPriorityGesture(
                DragGesture(minimumDistance: 8)
                    .onChanged { value in
                        dragOffset = max(0, value.translation.width)
                    }
                    .onEnded { value in
                        if value.translation.width > 100 || value.predictedEndTranslation.width > 200 {
                            withAnimation { onClose() }
                        } else {
                            withAnimation(.spring(response: 0.3)) { dragOffset = 0 }
                        }
                    }
            )
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Chat")
                    .font(.headline)
                    .foregroundStyle(.white)

                Spacer()

                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .background(Color.black.opacity(0.8))

            // Messages list
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(messages) { message in
                            ChatMessageRow(message: message)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) { _, _ in
                    if let lastMessage = messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Input field
            HStack(spacing: 12) {
                TextField("Message...", text: $messageText)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.1))
                    .foregroundStyle(.white)

                Button {
                    onSend(messageText)
                    messageText = ""
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundStyle(.yellow)
                }
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding()
            .background(Color.black.opacity(0.8))
        }
        .frame(width: 300)
        .frame(maxHeight: .infinity)
        .background(.ultraThinMaterial.opacity(0.9))
        .overlay(alignment: .leading) {
            dragHandle
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .offset(x: max(0, dragOffset))
    }
}

// MARK: - ChatMessageRow

private struct ChatMessageRow: View {
    let message: Message

    private var isFromRep: Bool {
        message.senderType == .rep
    }

    var body: some View {
        HStack {
            if isFromRep { Spacer() }

            VStack(alignment: isFromRep ? .trailing : .leading, spacing: 4) {
                if let senderName = message.senderName, !isFromRep {
                    Text(senderName)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Text(message.content)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isFromRep ? Color.yellow : Color.white.opacity(0.2))
                    .foregroundStyle(isFromRep ? .black : .white)

                Text(message.createdAt ?? Date(), style: .time)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if !isFromRep { Spacer() }
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        InCallChatView(
            messages: [
                Message(
                    id: UUID(),
                    senderType: .user,
                    senderName: "John",
                    content: "Hello!",
                    createdAt: Date()
                ),
                Message(
                    id: UUID(),
                    senderType: .rep,
                    senderName: "Support",
                    content: "Hi, how can I help?",
                    createdAt: Date()
                )
            ],
            onSend: { _ in },
            onClose: {}
        )
    }
}
