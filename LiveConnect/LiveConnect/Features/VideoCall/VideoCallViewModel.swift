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

/// Chat message payload sent/received via LiveKit data channel.
private struct DataChannelChatMessage: Codable {
    let id: String
    let content: String
    let senderType: String
    let senderName: String
    let sentAt: String
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

    /// The remote screen share video track (if visitor is sharing).
    private(set) var remoteScreenShareTrack: VideoTrack?

    /// Whether a remote participant is sharing their screen.
    var hasRemoteScreenShare: Bool { remoteScreenShareTrack != nil }

    /// Whether background blur is enabled on the local camera.
    private(set) var isBlurEnabled = false

    /// Whether the device supports background blur.
    private(set) var isBlurSupported = false

    /// Strong reference to the blur processor (LiveKit's weak var would deallocate it otherwise).
    private var blurProcessor: BackgroundBlurVideoProcessor?

    /// Chat messages.
    private(set) var messages: [Message] = []

    /// Whether there are unread chat messages (from visitors).
    private(set) var hasUnreadChat = false

    /// Whether the chat panel is currently open (set by the View).
    var isChatOpen = false

    /// Whether the call is connecting.
    private(set) var isConnecting = true

    /// The last error that occurred.
    private(set) var error: Error?

    /// Conversation ID for this call.
    private let conversationId: UUID

    /// Project ID for API calls.
    private let projectId: UUID

    /// Topic for chat data channel messages (must match web: "lc-chat").
    private let chatTopic = "lc-chat"

    /// Set of message IDs already received (for deduplication between data channel and WebSocket).
    private var receivedMessageIds: Set<UUID> = []

    init(conversationId: UUID, projectId: UUID) {
        self.conversationId = conversationId
        self.projectId = projectId
    }

    /// Clears the unread chat indicator.
    func markChatAsRead() {
        hasUnreadChat = false
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
            if publication.source == .screenShareVideo,
               let track = publication.track as? VideoTrack {
                remoteScreenShareTrack = track
            }
        }
    }

    nonisolated func room(_ room: Room, participant: RemoteParticipant, didUnsubscribeTrack publication: RemoteTrackPublication) {
        Task { @MainActor in
            trackUpdateCount += 1
            if publication.source == .screenShareVideo {
                remoteScreenShareTrack = nil
            }
        }
    }

    nonisolated func room(_ room: Room, participant: Participant,
                          trackPublication: TrackPublication, didUpdateIsMuted isMuted: Bool) {
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

            // Enable camera and microphone with enhanced audio processing
            try await room.localParticipant.setCamera(enabled: true)
            let audioCaptureOptions = AudioCaptureOptions(
                echoCancellation: true,
                autoGainControl: true,
                noiseSuppression: true
            )
            try await room.localParticipant.setMicrophone(
                enabled: true,
                captureOptions: audioCaptureOptions
            )

            // Background blur is supported on all devices with the built-in processor
            isBlurSupported = true

            // Register data channel chat handler for instant messaging
            let viewModel = self
            try await room.registerTextStreamHandler(for: chatTopic) { reader, participantIdentity in
                do {
                    let text = try await reader.readAll()
                    guard let data = text.data(using: .utf8) else { return }
                    let payload = try JSONDecoder().decode(DataChannelChatMessage.self, from: data)
                    guard let messageId = UUID(uuidString: payload.id) else { return }

                    await MainActor.run {
                        guard !viewModel.receivedMessageIds.contains(messageId) else { return }
                        viewModel.receivedMessageIds.insert(messageId)

                        let message = Message(
                            id: messageId,
                            senderType: payload.senderType == "REP" ? .rep : .user,
                            senderName: payload.senderName,
                            content: payload.content,
                            createdAt: ISO8601DateFormatter().date(from: payload.sentAt)
                        )
                        viewModel.messages.append(message)
                        if message.senderType != .rep && !viewModel.isChatOpen {
                            viewModel.hasUnreadChat = true
                        }
                    }
                } catch {
                    print("[VideoCall] Failed to parse data channel chat: \(error)")
                }
            }

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
        remoteScreenShareTrack = nil
        isBlurEnabled = false
        blurProcessor = nil
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

    /// Toggles background blur on the local camera track.
    func toggleBlur() async {
        guard let localParticipant,
              let cameraPublication = localParticipant.trackPublications.values
                  .first(where: { $0.source == .camera }) as? LocalTrackPublication,
              let videoTrack = cameraPublication.track as? LocalVideoTrack else { return }

        if isBlurEnabled {
            videoTrack.processor = nil
            blurProcessor = nil
            isBlurEnabled = false
        } else {
            let processor = BackgroundBlurVideoProcessor()
            blurProcessor = processor
            videoTrack.processor = processor
            isBlurEnabled = true
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

    /// Sends a chat message via dual-path: data channel (instant) + REST API (persistence).
    /// - Parameter content: The message content.
    func sendMessage(_ content: String) async {
        guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let messageId = UUID()
        let messageIdString = messageId.uuidString.lowercased()
        let repDisplayName = AuthManager.shared.currentUser?.displayName ?? "Rep"

        // Track this message ID to prevent dedup with WebSocket echo
        receivedMessageIds.insert(messageId)

        // Optimistic UI update
        let optimistic = Message(
            id: messageId,
            senderType: .rep,
            senderName: "You",
            content: content,
            createdAt: Date()
        )
        messages.append(optimistic)

        // Path 1: Instant — data channel
        if let room {
            do {
                let payload = DataChannelChatMessage(
                    id: messageIdString,
                    content: content,
                    senderType: "REP",
                    senderName: repDisplayName,
                    sentAt: ISO8601DateFormatter().string(from: Date())
                )
                let jsonData = try JSONEncoder().encode(payload)
                let jsonString = String(data: jsonData, encoding: .utf8) ?? ""
                try await room.localParticipant.sendText(jsonString, for: chatTopic)
            } catch {
                print("[VideoCall] Data channel send failed: \(error)")
            }
        }

        // Path 2: Persistence — REST API
        do {
            let _: Message = try await APIClient.shared.post(
                Endpoints.sendMessage(projectId: projectId, conversationId: conversationId),
                body: ["content": content, "messageId": messageIdString]
            )
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
            // Seed dedup set with existing message IDs
            receivedMessageIds = Set(response.messages.map(\.id))
        } catch {
            self.error = error
        }
    }

    /// Adds a received message (from WebSocket). Deduplicates against data channel messages.
    func addReceivedMessage(_ message: Message) {
        guard !receivedMessageIds.contains(message.id) else { return }
        receivedMessageIds.insert(message.id)

        if !messages.contains(where: { $0.id == message.id }) {
            messages.append(message)
            if message.senderType != .rep && !isChatOpen {
                hasUnreadChat = true
            }
        }
    }
}
