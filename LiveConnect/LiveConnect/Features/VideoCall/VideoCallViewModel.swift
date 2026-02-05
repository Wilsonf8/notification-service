//
//  VideoCallViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation
import LiveKit

/// View model for the video call screen.
@MainActor
@Observable
final class VideoCallViewModel {
    /// The LiveKit room.
    private(set) var room: Room?

    /// Local participant.
    var localParticipant: LocalParticipant? {
        room?.localParticipant
    }

    /// Remote participants.
    var remoteParticipants: [RemoteParticipant] {
        room?.remoteParticipants.values.map { $0 } ?? []
    }

    /// The first remote participant (visitor).
    var visitorParticipant: RemoteParticipant? {
        remoteParticipants.first
    }

    /// Whether the microphone is muted.
    private(set) var isMicrophoneMuted = false

    /// Whether the camera is enabled.
    private(set) var isCameraEnabled = true

    /// Chat messages.
    private(set) var messages: [Message] = []

    /// Whether the call is connecting.
    private(set) var isConnecting = true

    /// The last error that occurred.
    private(set) var error: Error?

    /// Conversation ID for this call.
    private let conversationId: UUID

    /// Project ID for API calls.
    private let projectId: UUID

    init(conversationId: UUID, projectId: UUID) {
        self.conversationId = conversationId
        self.projectId = projectId
    }

    // MARK: - Public Methods

    /// Connects to the LiveKit room.
    /// - Parameters:
    ///   - url: The LiveKit server URL.
    ///   - token: The access token.
    func connect(url: String, token: String) async {
        isConnecting = true
        error = nil

        do {
            let room = Room()
            self.room = room

            // Connect to the room
            try await room.connect(url: url, token: token)

            // Enable camera and microphone
            try await room.localParticipant.setCamera(enabled: true)
            try await room.localParticipant.setMicrophone(enabled: true)

            isConnecting = false
        } catch {
            self.error = error
            isConnecting = false
        }
    }

    /// Disconnects from the room.
    func disconnect() async {
        await room?.disconnect()
        room = nil
    }

    /// Toggles the microphone mute state.
    func toggleMicrophone() async {
        guard let localParticipant else { return }

        do {
            isMicrophoneMuted.toggle()
            try await localParticipant.setMicrophone(enabled: !isMicrophoneMuted)
        } catch {
            isMicrophoneMuted.toggle() // Revert on failure
            self.error = error
        }
    }

    /// Toggles the camera state.
    func toggleCamera() async {
        guard let localParticipant else { return }

        do {
            isCameraEnabled.toggle()
            try await localParticipant.setCamera(enabled: isCameraEnabled)
        } catch {
            isCameraEnabled.toggle() // Revert on failure
            self.error = error
        }
    }

    /// Ends the call.
    func endCall() async {
        // End the conversation via API
        do {
            try await APIClient.shared.post(
                Endpoints.endConversation(projectId: projectId, conversationId: conversationId),
                body: Optional<String>.none
            )
        } catch {
            self.error = error
        }

        await disconnect()
    }

    /// Sends a chat message.
    /// - Parameter content: The message content.
    func sendMessage(_ content: String) async {
        guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        do {
            let message: Message = try await APIClient.shared.post(
                Endpoints.sendMessage(projectId: projectId, conversationId: conversationId),
                body: ["content": content]
            )
            messages.append(message)
        } catch {
            self.error = error
        }
    }

    /// Loads existing messages for the conversation.
    func loadMessages() async {
        do {
            messages = try await APIClient.shared.get(
                Endpoints.messages(projectId: projectId, conversationId: conversationId)
            )
        } catch {
            self.error = error
        }
    }

    /// Adds a received message (from WebSocket).
    func addReceivedMessage(_ message: Message) {
        if !messages.contains(where: { $0.id == message.id }) {
            messages.append(message)
        }
    }
}
