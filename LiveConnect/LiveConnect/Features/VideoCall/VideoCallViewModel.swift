//
//  VideoCallViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation
import LiveKit

/// Response wrapper for paginated messages.
private struct MessageListResponse: Codable {
    let messages: [Message]
}

/// View model for the video call screen.
@MainActor
@Observable
final class VideoCallViewModel: RoomDelegate {
    /// The LiveKit room.
    private(set) var room: Room?

    /// Local participant.
    var localParticipant: LocalParticipant? {
        room?.localParticipant
    }

    /// Cached remote participants (updated via delegate).
    private(set) var remoteParticipants: [RemoteParticipant] = []

    /// The first remote participant (visitor).
    var visitorParticipant: RemoteParticipant? {
        remoteParticipants.first
    }

    /// Counter that increments when tracks update (forces view refresh).
    private(set) var trackUpdateCount = 0

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

    // MARK: - RoomDelegate

    nonisolated func room(_ room: Room, participantDidConnect participant: RemoteParticipant) {
        Task { @MainActor in
            updateRemoteParticipants()
        }
    }

    nonisolated func room(_ room: Room, participantDidDisconnect participant: RemoteParticipant) {
        Task { @MainActor in
            updateRemoteParticipants()
        }
    }

    nonisolated func room(_ room: Room, participant: RemoteParticipant, didSubscribeTrack publication: RemoteTrackPublication) {
        Task { @MainActor in
            trackUpdateCount += 1
        }
    }

    nonisolated func room(_ room: Room, participant: RemoteParticipant, didUnsubscribeTrack publication: RemoteTrackPublication) {
        Task { @MainActor in
            trackUpdateCount += 1
        }
    }

    /// Updates the cached remote participants from the room.
    private func updateRemoteParticipants() {
        remoteParticipants = room?.remoteParticipants.values.map { $0 } ?? []
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
            room.add(delegate: self)
            self.room = room

            // Connect to the room
            try await room.connect(url: url, token: token)

            // Sync any participants already in the room
            updateRemoteParticipants()

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
        room?.remove(delegate: self)
        await room?.disconnect()
        room = nil
        remoteParticipants = []
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
            let response: MessageListResponse = try await APIClient.shared.get(
                Endpoints.messages(projectId: projectId, conversationId: conversationId)
            )
            messages = response.messages
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
