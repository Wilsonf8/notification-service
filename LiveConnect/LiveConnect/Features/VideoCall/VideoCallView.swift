//
//  VideoCallView.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI
import LiveKit

/// Full-screen video call view.
struct VideoCallView: View {
    let conversationId: UUID
    let visitorId: UUID?
    let livekitUrl: String
    let livekitToken: String
    let projectId: UUID
    let webSocketManager: WebSocketManager
    let onDismiss: () -> Void

    @State private var viewModel: VideoCallViewModel
    @State private var showChat = false
    @State private var showInfo = false

    init(
        conversationId: UUID,
        visitorId: UUID? = nil,
        livekitUrl: String,
        livekitToken: String,
        projectId: UUID,
        webSocketManager: WebSocketManager,
        onDismiss: @escaping () -> Void
    ) {
        self.conversationId = conversationId
        self.visitorId = visitorId
        self.livekitUrl = livekitUrl
        self.livekitToken = livekitToken
        self.projectId = projectId
        self.webSocketManager = webSocketManager
        self.onDismiss = onDismiss
        self._viewModel = State(initialValue: VideoCallViewModel(
            conversationId: conversationId,
            projectId: projectId
        ))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if viewModel.isConnecting {
                connectingView
            } else if let error = viewModel.error {
                errorView(error)
            } else {
                callView
            }
        }
        .task {
            await viewModel.connect(url: livekitUrl, token: livekitToken)
            await viewModel.loadMessages()

            // Connect WebSocket message handler for this conversation
            webSocketManager.onMessageReceived = { [viewModel] message in
                viewModel.addReceivedMessage(message)
            }
        }
        .onChange(of: showChat) { _, isOpen in
            viewModel.isChatOpen = isOpen
            if isOpen {
                viewModel.markChatAsRead()
            }
        }
        .onDisappear {
            // Clear the message handler when leaving
            webSocketManager.onMessageReceived = nil

            Task {
                await viewModel.disconnect()
            }
        }
    }

    // MARK: - Connecting View

    private var connectingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.white)

            Text("Connecting...")
                .font(.headline)
                .foregroundStyle(.white)
        }
    }

    // MARK: - Error View

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.red)

            Text("Failed to connect")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Close") {
                onDismiss()
            }
            .buttonStyle(.bordered)
            .tint(.white)
        }
        .padding()
    }

    // MARK: - Call View

    private var callView: some View {
        GeometryReader { geometry in
            ZStack {
                if viewModel.hasRemoteScreenShare {
                    // Screen share layout: screen share fills main area
                    SwiftUIVideoView(viewModel.remoteScreenShareTrack!, layoutMode: .fit)
                        .ignoresSafeArea()

                    // Screen share indicator
                    VStack {
                        HStack {
                            Label("Screen Share", systemImage: "rectangle.inset.filled.on.rectangle")
                                .font(.caption)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.green.opacity(0.8))
                            Spacer()
                        }
                        .padding(.leading, 16)
                        .padding(.top, geometry.safeAreaInsets.top + 8)
                        Spacer()
                    }

                    // Remote camera PIP (bottom-left)
                    if let visitorParticipant = viewModel.visitorParticipant {
                        ParticipantVideoView(participant: visitorParticipant, trackUpdateCount: viewModel.trackUpdateCount)
                            .frame(width: 120, height: 120)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.3), lineWidth: 1.5)
                            )
                            .shadow(radius: 8)
                            .position(
                                x: 80,
                                y: geometry.size.height - 140
                            )
                    }
                } else {
                    // Normal layout: remote camera in centered square container
                    if let visitorParticipant = viewModel.visitorParticipant {
                        ParticipantVideoView(participant: visitorParticipant, trackUpdateCount: viewModel.trackUpdateCount)
                            .aspectRatio(1, contentMode: .fit)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.3), lineWidth: 1.5)
                            )
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        VStack(spacing: 16) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 60))
                                .foregroundStyle(.secondary)

                            Text("Waiting for visitor...")
                                .font(.headline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Local video (picture-in-picture, top-right)
                if let localParticipant = viewModel.localParticipant {
                    LocalVideoView(participant: localParticipant, trackUpdateCount: viewModel.trackUpdateCount)
                        .frame(width: 120, height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.3), lineWidth: 1.5)
                        )
                        .shadow(radius: 8)
                        .position(
                            x: geometry.size.width - 80,
                            y: geometry.safeAreaInsets.top + 80
                        )
                }

                // Controls overlay
                VStack {
                    Spacer()

                    // Bottom controls
                    controlsBar
                        .padding(.bottom, 32)
                }
                .frame(maxWidth: .infinity)

                // Chat panel
                if showChat {
                    InCallChatView(
                        messages: viewModel.messages,
                        onSend: { content in
                            Task {
                                await viewModel.sendMessage(content)
                            }
                        },
                        onClose: {
                            showChat = false
                        }
                    )
                    .transition(.move(edge: .trailing))
                }

                // Visitor info panel
                if showInfo, let visitorId {
                    InCallVisitorInfoView(
                        projectId: projectId,
                        visitorId: visitorId,
                        onClose: { showInfo = false }
                    )
                    .transition(.move(edge: .trailing))
                }
            }
        }
    }

    // MARK: - Controls Bar

    private var controlsBar: some View {
        HStack(spacing: 16) {
            // Mute button
            ControlButton(
                icon: viewModel.isMicrophoneMuted ? "mic.slash.fill" : "mic.fill",
                isActive: !viewModel.isMicrophoneMuted
            ) {
                Task {
                    await viewModel.toggleMicrophone()
                }
            }

            // Camera button
            ControlButton(
                icon: viewModel.isCameraEnabled ? "video.fill" : "video.slash.fill",
                isActive: viewModel.isCameraEnabled
            ) {
                Task {
                    await viewModel.toggleCamera()
                }
            }

            // Flip camera button (only shown when device has multiple cameras and camera is on)
            if viewModel.canFlipCamera && viewModel.isCameraEnabled {
                ControlButton(
                    icon: "arrow.triangle.2.circlepath.camera",
                    isActive: true
                ) {
                    Task {
                        await viewModel.flipCamera()
                    }
                }
            }

            // Blur button (only shown when supported)
            if viewModel.isBlurSupported {
                ControlButton(
                    icon: viewModel.isBlurEnabled ? "wand.and.stars" : "wand.and.stars",
                    isActive: viewModel.isBlurEnabled
                ) {
                    Task {
                        await viewModel.toggleBlur()
                    }
                }
            }

            // Visitor info button (only when visitorId is available)
            if visitorId != nil {
                ControlButton(
                    icon: "person.text.rectangle",
                    isActive: showInfo
                ) {
                    withAnimation {
                        showInfo.toggle()
                        if showInfo { showChat = false }
                    }
                }
            }

            // Chat button
            ControlButton(
                icon: "bubble.left.fill",
                isActive: showChat,
                showBadge: viewModel.hasUnreadChat && !showChat
            ) {
                withAnimation {
                    showChat.toggle()
                    if showChat { showInfo = false }
                }
            }

            // End call button
            Button {
                Task {
                    await viewModel.endCall()
                    onDismiss()
                }
            } label: {
                Image(systemName: "phone.down.fill")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(.red)
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 10)
        .glassBackground()
    }
}

// MARK: - ControlButton

private struct ControlButton: View {
    let icon: String
    let isActive: Bool
    var showBadge: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(isActive ? .white : .secondary)
                .frame(width: 40, height: 40)
                .background(isActive ? Color.white.opacity(0.2) : Color.white.opacity(0.1))
                .clipShape(Circle())
                .overlay(alignment: .topTrailing) {
                    if showBadge {
                        Circle()
                            .fill(.red)
                            .frame(width: 8, height: 8)
                            .offset(x: 2, y: -2)
                    }
                }
        }
    }
}

// MARK: - ParticipantVideoView

private struct ParticipantVideoView: View {
    let participant: RemoteParticipant
    let trackUpdateCount: Int

    private var videoTrack: VideoTrack? {
        participant.trackPublications.values
            .compactMap { $0 as? RemoteTrackPublication }
            .first { $0.kind == .video && $0.source == .camera }?
            .track as? VideoTrack
    }

    var body: some View {
        if let track = videoTrack, !track.isMuted {
            SwiftUIVideoView(track, layoutMode: .fill)
        } else {
            // No video track or track is muted, show placeholder
            ZStack {
                Color.black
                VStack(spacing: 12) {
                    Image(systemName: "video.slash")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("Camera off")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

// MARK: - LocalVideoView

private struct LocalVideoView: View {
    let participant: LocalParticipant
    let trackUpdateCount: Int

    private var videoTrack: VideoTrack? {
        participant.trackPublications.values
            .compactMap { $0 as? LocalTrackPublication }
            .first { $0.kind == .video }?
            .track as? VideoTrack
    }

    var body: some View {
        if let track = videoTrack, !track.isMuted {
            SwiftUIVideoView(track, layoutMode: .fill)
        } else {
            ZStack {
                Color(white: 0.2)
                Image(systemName: "video.slash")
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    VideoCallView(
        conversationId: UUID(),
        visitorId: UUID(),
        livekitUrl: "wss://example.livekit.cloud",
        livekitToken: "token",
        projectId: UUID(),
        webSocketManager: WebSocketManager()
    ) {}
}
