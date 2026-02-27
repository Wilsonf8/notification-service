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
    let visitorName: String?
    let livekitUrl: String
    let livekitToken: String
    let projectId: UUID
    let webSocketManager: WebSocketManager
    let onDismiss: () -> Void

    @State private var viewModel: VideoCallViewModel
    @State private var showChat = false
    @State private var showInfo = false
    @State private var localPIPCorner: PIPCorner = .topTrailing
    @State private var pipDragOffset: CGSize = .zero
    @State private var showControls = true
    @State private var controlsHideTask: Task<Void, Never>?

    init(
        conversationId: UUID,
        visitorId: UUID? = nil,
        visitorName: String? = nil,
        livekitUrl: String,
        livekitToken: String,
        projectId: UUID,
        webSocketManager: WebSocketManager,
        onDismiss: @escaping () -> Void
    ) {
        self.conversationId = conversationId
        self.visitorId = visitorId
        self.visitorName = visitorName
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

            // Start auto-hide timer after connecting
            scheduleControlsHide()
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
        VStack(spacing: 24) {
            ZStack {
                // Pulsing rings
                ConnectingPulseRing(delay: 0.0)
                ConnectingPulseRing(delay: 0.6)
                ConnectingPulseRing(delay: 1.2)

                // Center icon
                Image(systemName: "video.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.yellow)
                    .symbolEffect(.pulse)
            }
            .frame(width: 120, height: 120)

            VStack(spacing: 8) {
                Text("Connecting...")
                    .font(.headline)
                    .foregroundStyle(.white)

                Text("Setting up your video call...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Error View

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(.red)
                .symbolEffect(.bounce)

            Text("Failed to connect")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            VStack(spacing: 12) {
                GlassButton("Retry", icon: "arrow.clockwise", style: .primary) {
                    Task {
                        viewModel.clearError()
                        await viewModel.connect(url: livekitUrl, token: livekitToken)
                    }
                }

                GlassButton("Close", style: .secondary) {
                    onDismiss()
                }
            }
            .padding(.top, 8)
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
                    // Normal layout: remote camera fills entire screen
                    if let visitorParticipant = viewModel.visitorParticipant {
                        ParticipantVideoView(participant: visitorParticipant, trackUpdateCount: viewModel.trackUpdateCount)
                            .aspectRatio(1, contentMode: .fit)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        WaitingForVisitorView()
                    }
                }

                // Local video (picture-in-picture, draggable)
                if let localParticipant = viewModel.localParticipant {
                    let pipSize: CGFloat = 140
                    let padding: CGFloat = 16
                    let pipPosition = localPIPCorner.position(
                        in: geometry.size,
                        safeArea: geometry.safeAreaInsets,
                        pipSize: pipSize,
                        padding: padding
                    )

                    LocalVideoView(participant: localParticipant, trackUpdateCount: viewModel.trackUpdateCount)
                        .frame(width: pipSize, height: pipSize)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.3), lineWidth: 1.5)
                        )
                        .shadow(radius: 8)
                        .position(
                            x: pipPosition.x + pipDragOffset.width,
                            y: pipPosition.y + pipDragOffset.height
                        )
                        .gesture(
                            DragGesture()
                                .onChanged { value in
                                    pipDragOffset = value.translation
                                }
                                .onEnded { value in
                                    let endX = pipPosition.x + value.translation.width
                                    let endY = pipPosition.y + value.translation.height
                                    let newCorner = PIPCorner.nearest(
                                        to: CGPoint(x: endX, y: endY),
                                        in: geometry.size,
                                        safeArea: geometry.safeAreaInsets,
                                        pipSize: pipSize,
                                        padding: padding
                                    )
                                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                                        localPIPCorner = newCorner
                                        pipDragOffset = .zero
                                    }
                                }
                        )
                }

                // Tap to toggle controls visibility
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            showControls.toggle()
                        }
                        if showControls {
                            scheduleControlsHide()
                        }
                    }

                // Controls overlay
                if showControls || showChat || showInfo {
                    VStack {
                        // Top status bar
                        callStatusBar
                            .padding(.top, 8)
                            .transition(.move(edge: .top).combined(with: .opacity))

                        Spacer()

                        // Bottom controls
                        controlsBar
                            .padding(.bottom, 32)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    .frame(maxWidth: .infinity)
                }

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
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                                showChat = false
                            }
                        }
                    )
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .trailing).combined(with: .opacity)
                    ))
                }

                // Visitor info panel
                if showInfo, let visitorId {
                    InCallVisitorInfoView(
                        projectId: projectId,
                        visitorId: visitorId,
                        onClose: {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                                showInfo = false
                            }
                        }
                    )
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .trailing).combined(with: .opacity)
                    ))
                }
            }
        }
    }

    // MARK: - Call Status Bar

    /// Top HUD showing connection status, visitor name, and call duration.
    private var callStatusBar: some View {
        HStack(spacing: 10) {
            // Connection indicator
            Circle()
                .fill(.green)
                .frame(width: 8, height: 8)

            // Visitor avatar + name
            if let name = visitorName {
                Circle()
                    .fill(Color.yellow.opacity(0.3))
                    .frame(width: 28, height: 28)
                    .overlay(
                        Text(name.prefix(1).uppercased())
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(.yellow)
                    )

                Text(name)
                    .font(.subheadline)
                    .foregroundStyle(.white)
            }

            Spacer()

            // Call duration timer
            if viewModel.callStartTime != nil {
                TimelineView(.periodic(from: .now, by: 1.0)) { _ in
                    Text(viewModel.formattedDuration)
                        .font(.subheadline)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .glassBackground()
        .padding(.horizontal)
    }

    // MARK: - Controls Auto-Hide

    /// Schedules hiding controls after 4 seconds of inactivity.
    private func scheduleControlsHide() {
        controlsHideTask?.cancel()
        controlsHideTask = Task {
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            // Don't hide if a panel is open
            if !showChat && !showInfo {
                withAnimation(.easeInOut(duration: 0.25)) {
                    showControls = false
                }
            }
        }
    }

    // MARK: - Controls Bar

    /// Vertical divider between control groups.
    private var controlDivider: some View {
        Capsule()
            .fill(Color.white.opacity(0.2))
            .frame(width: 1, height: 24)
    }

    private var controlsBar: some View {
        HStack(spacing: 8) {
            // Media controls group
            HStack(spacing: 8) {
                CallControlButton(
                    icon: viewModel.isMicrophoneMuted ? "mic.slash.fill" : "mic.fill",
                    isActive: viewModel.isMicrophoneMuted,
                    tint: .muted
                ) {
                    Task { await viewModel.toggleMicrophone() }
                }
                .overlay {
                    if viewModel.isMicrophoneMuted {
                        MutedPulseRing()
                    }
                }
                .accessibilityLabel(viewModel.isMicrophoneMuted ? "Unmute microphone" : "Mute microphone")

                CallControlButton(
                    icon: viewModel.isCameraEnabled ? "video.fill" : "video.slash.fill",
                    isActive: !viewModel.isCameraEnabled,
                    tint: .muted
                ) {
                    Task { await viewModel.toggleCamera() }
                }
                .accessibilityLabel(viewModel.isCameraEnabled ? "Turn off camera" : "Turn on camera")

                if viewModel.canFlipCamera && viewModel.isCameraEnabled {
                    CallControlButton(
                        icon: "arrow.triangle.2.circlepath.camera",
                        isActive: false
                    ) {
                        Task { await viewModel.flipCamera() }
                    }
                    .accessibilityLabel("Flip camera")
                }

                if viewModel.isBlurSupported {
                    CallControlButton(
                        icon: "wand.and.stars",
                        isActive: viewModel.isBlurEnabled
                    ) {
                        Task { await viewModel.toggleBlur() }
                    }
                    .accessibilityLabel(viewModel.isBlurEnabled ? "Disable background blur" : "Enable background blur")
                }
            }

            controlDivider

            // Panel controls group
            HStack(spacing: 8) {
                if visitorId != nil {
                    CallControlButton(
                        icon: "person.text.rectangle",
                        isActive: showInfo,
                        tint: .panel
                    ) {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                            showInfo.toggle()
                            if showInfo { showChat = false }
                        }
                    }
                    .accessibilityLabel("Visitor info")
                }

                CallControlButton(
                    icon: "bubble.left.fill",
                    isActive: showChat,
                    tint: .panel,
                    showBadge: viewModel.hasUnreadChat && !showChat
                ) {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                        showChat.toggle()
                        if showChat { showInfo = false }
                    }
                }
                .accessibilityLabel("Chat")
            }

            controlDivider

            // End call
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
                    .glassEffect(.regular.tint(.red).interactive())
            }
            .accessibilityLabel("End call")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .glassBackground()
    }
}

// MARK: - PIPCorner

/// Corner position for the local picture-in-picture video.
enum PIPCorner {
    case topLeading, topTrailing, bottomLeading, bottomTrailing

    /// Computes the center position for the PIP in the given container.
    /// - Parameters:
    ///   - size: Container size.
    ///   - safeArea: Safe area insets.
    ///   - pipSize: Width/height of the PIP view.
    ///   - padding: Edge padding.
    /// - Returns: The center point for positioning.
    func position(in size: CGSize, safeArea: EdgeInsets, pipSize: CGFloat, padding: CGFloat) -> CGPoint {
        let halfPip = pipSize / 2
        let left = padding + halfPip
        let right = size.width - padding - halfPip
        let top = safeArea.top + padding + halfPip
        let bottom = size.height - safeArea.bottom - padding - halfPip - 100 // room for controls

        switch self {
        case .topLeading:     return CGPoint(x: left, y: top)
        case .topTrailing:    return CGPoint(x: right, y: top)
        case .bottomLeading:  return CGPoint(x: left, y: bottom)
        case .bottomTrailing: return CGPoint(x: right, y: bottom)
        }
    }

    /// Returns the nearest corner to a given point.
    static func nearest(to point: CGPoint, in size: CGSize, safeArea: EdgeInsets, pipSize: CGFloat, padding: CGFloat) -> PIPCorner {
        let corners: [PIPCorner] = [.topLeading, .topTrailing, .bottomLeading, .bottomTrailing]
        return corners.min { a, b in
            let posA = a.position(in: size, safeArea: safeArea, pipSize: pipSize, padding: padding)
            let posB = b.position(in: size, safeArea: safeArea, pipSize: pipSize, padding: padding)
            let distA = hypot(point.x - posA.x, point.y - posA.y)
            let distB = hypot(point.x - posB.x, point.y - posB.y)
            return distA < distB
        } ?? .topTrailing
    }
}

// MARK: - CallControlButton

/// Style hint for CallControlButton glass tinting.
enum CallControlTint {
    /// Default active state — plain glass.
    case standard
    /// Muted/off state — red-tinted glass.
    case muted
    /// Active panel toggle — yellow-tinted glass.
    case panel

}

private struct CallControlButton: View {
    let icon: String
    let isActive: Bool
    var tint: CallControlTint = .standard
    var showBadge: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(isActive ? .white : .secondary)
                .contentTransition(.symbolEffect(.replace))
                .frame(width: 44, height: 44)
                .modifier(CallControlGlassModifier(isActive: isActive, tint: tint))
                .overlay(alignment: .topTrailing) {
                    if showBadge {
                        BadgePulse()
                            .offset(x: 2, y: -2)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
        }
        .sensoryFeedback(.impact(flexibility: .soft), trigger: isActive)
        .accessibilityAddTraits(.isToggle)
    }
}

/// Applies the appropriate Liquid Glass effect based on active state and tint.
private struct CallControlGlassModifier: ViewModifier {
    let isActive: Bool
    let tint: CallControlTint

    func body(content: Content) -> some View {
        if isActive {
            switch tint {
            case .standard:
                content.glassEffect(.regular.interactive())
            case .muted:
                content.glassEffect(.regular.tint(.red).interactive())
            case .panel:
                content.glassEffect(.regular.tint(.yellow).interactive())
            }
        } else {
            content.glassEffect(.regular.interactive())
        }
    }
}

/// Pulsing red ring overlay for the muted microphone button.
private struct MutedPulseRing: View {
    @State private var isExpanded = false

    var body: some View {
        Circle()
            .stroke(Color.red.opacity(0.6), lineWidth: 2)
            .frame(width: 44, height: 44)
            .scaleEffect(isExpanded ? 1.15 : 1.0)
            .opacity(isExpanded ? 0.0 : 0.8)
            .animation(
                .easeInOut(duration: 1.2).repeatForever(autoreverses: false),
                value: isExpanded
            )
            .onAppear { isExpanded = true }
            .allowsHitTesting(false)
    }
}

/// Pulsing red badge for unread chat indicator.
private struct BadgePulse: View {
    @State private var isPulsing = false

    var body: some View {
        ZStack {
            // Pulse ring
            Circle()
                .stroke(Color.red.opacity(0.5), lineWidth: 1.5)
                .frame(width: 8, height: 8)
                .scaleEffect(isPulsing ? 2.0 : 1.0)
                .opacity(isPulsing ? 0.0 : 0.8)
                .animation(
                    .easeOut(duration: 1.0).repeatForever(autoreverses: false),
                    value: isPulsing
                )

            // Solid dot
            Circle()
                .fill(.red)
                .frame(width: 8, height: 8)
        }
        .onAppear { isPulsing = true }
    }
}

/// A single expanding ring used in the connecting animation.
private struct ConnectingPulseRing: View {
    let delay: Double
    @State private var isExpanded = false

    var body: some View {
        Circle()
            .stroke(Color.yellow.opacity(0.3), lineWidth: 2)
            .scaleEffect(isExpanded ? 1.0 : 0.3)
            .opacity(isExpanded ? 0.0 : 0.8)
            .animation(
                .easeOut(duration: 1.8).repeatForever(autoreverses: false).delay(delay),
                value: isExpanded
            )
            .onAppear { isExpanded = true }
    }
}

// MARK: - WaitingForVisitorView

/// Animated placeholder shown while waiting for a remote participant to join.
private struct WaitingForVisitorView: View {
    @State private var isPulsing = false

    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                // Outer pulse ring
                Circle()
                    .stroke(Color.yellow.opacity(0.2), lineWidth: 2)
                    .frame(width: 100, height: 100)
                    .scaleEffect(isPulsing ? 1.3 : 1.0)
                    .opacity(isPulsing ? 0.0 : 0.6)

                // Avatar circle
                Circle()
                    .fill(Color.yellow.opacity(0.15))
                    .frame(width: 100, height: 100)
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(.yellow.opacity(0.6))
                    )
            }
            .animation(
                .easeInOut(duration: 1.8).repeatForever(autoreverses: false),
                value: isPulsing
            )

            Text("Waiting for visitor...")
                .font(.headline)
                .foregroundStyle(.secondary)

            ProgressView()
                .tint(.secondary)
        }
        .onAppear { isPulsing = true }
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
            ZStack {
                Color.black
                VStack(spacing: 16) {
                    Circle()
                        .fill(Color.yellow.opacity(0.15))
                        .frame(width: 100, height: 100)
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(.yellow.opacity(0.6))
                        )

                    Label("Camera off", systemImage: "video.slash")
                        .font(.subheadline)
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
                VStack(spacing: 8) {
                    Circle()
                        .fill(Color.yellow.opacity(0.15))
                        .frame(width: 40, height: 40)
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.body)
                                .foregroundStyle(.yellow.opacity(0.6))
                        )

                    Image(systemName: "video.slash")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
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
