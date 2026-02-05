//
//  WebSocketManager.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation
import Starscream

/// WebSocket event types received from the server.
enum WebSocketEvent: String, Sendable {
    case visitorJoined = "visitor_joined"
    case visitorLeft = "visitor_left"
    case visitorUpdated = "visitor_updated"
    case requestReceived = "request_received"
    case requestExpired = "request_expired"
    case callStartedBroadcast = "call_started_broadcast"
    case callEndedBroadcast = "call_ended_broadcast"
    case messageReceived = "message_received"
    case repAvailabilityChanged = "rep_availability_changed"
    case repPresenceChanged = "rep_presence_changed"
}

/// Payload wrapper for WebSocket messages.
struct WebSocketMessage: Codable, Sendable {
    let type: String
    let payload: WebSocketPayload
}

/// Union type for different WebSocket payloads.
enum WebSocketPayload: Codable, Sendable {
    case visitor(Visitor)
    case request(Request)
    case activeCall(ActiveCall)
    case message(Message)
    case rep(Rep)
    case raw(Data)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // Default to raw data - actual parsing happens in handleMessage
        let data = try container.decode(Data.self)
        self = .raw(data)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .visitor(let visitor):
            try container.encode(visitor)
        case .request(let request):
            try container.encode(request)
        case .activeCall(let call):
            try container.encode(call)
        case .message(let message):
            try container.encode(message)
        case .rep(let rep):
            try container.encode(rep)
        case .raw(let data):
            try container.encode(data)
        }
    }
}

/// Represents an active call from WebSocket events.
struct ActiveCall: Codable, Identifiable, Sendable {
    let conversationId: UUID
    let visitorId: UUID
    let visitorName: String?
    let repId: UUID
    let repUserId: UUID
    let repName: String
    let startedAt: Date

    var id: UUID { conversationId }

    enum CodingKeys: String, CodingKey {
        case conversationId = "conversation_id"
        case visitorId = "visitor_id"
        case visitorName = "visitor_name"
        case repId = "rep_id"
        case repUserId = "rep_user_id"
        case repName = "rep_name"
        case startedAt = "started_at"
    }
}

/// Connection state for the WebSocket.
enum ConnectionState: Sendable {
    case disconnected
    case connecting
    case connected
    case reconnecting
}

/// Manages WebSocket connection for real-time dashboard updates.
@MainActor
@Observable
final class WebSocketManager: WebSocketDelegate {
    /// Current connection state.
    private(set) var connectionState: ConnectionState = .disconnected

    /// Whether the socket is connected.
    var isConnected: Bool {
        connectionState == .connected
    }

    /// Current project ID.
    private var projectId: UUID?

    /// The WebSocket instance.
    private var socket: WebSocket?

    /// Reconnection attempt count.
    private var reconnectAttempts = 0

    /// Maximum reconnection attempts.
    private let maxReconnectAttempts = 5

    /// Base delay for exponential backoff (seconds).
    private let baseReconnectDelay: TimeInterval = 1.0

    /// JSON decoder for parsing messages.
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    /// Callbacks for different event types.
    var onVisitorJoined: ((Visitor) -> Void)?
    var onVisitorLeft: ((UUID) -> Void)?
    var onVisitorUpdated: ((Visitor) -> Void)?
    var onRequestReceived: ((Request) -> Void)?
    var onRequestExpired: ((UUID) -> Void)?
    var onCallStarted: ((ActiveCall) -> Void)?
    var onCallEnded: ((UUID) -> Void)?
    var onMessageReceived: ((Message) -> Void)?
    var onRepUpdated: ((Rep) -> Void)?

    // MARK: - Public Methods

    /// Connects to the WebSocket for a specific project.
    /// - Parameter projectId: The project UUID to connect to.
    func connect(projectId: UUID) {
        self.projectId = projectId
        reconnectAttempts = 0
        performConnect()
    }

    /// Disconnects the WebSocket.
    func disconnect() {
        socket?.disconnect()
        socket = nil
        connectionState = .disconnected
        projectId = nil
        reconnectAttempts = 0
    }

    // MARK: - Private Methods

    /// Performs the actual connection.
    private func performConnect() {
        guard let projectId else { return }

        let urlString = Endpoints.webSocket(projectId: projectId)
        guard var request = URL(string: urlString).map({ URLRequest(url: $0) }) else {
            return
        }

        // Add auth token
        if let token = KeychainService.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        connectionState = reconnectAttempts > 0 ? .reconnecting : .connecting

        socket = WebSocket(request: request)
        socket?.delegate = self
        socket?.connect()
    }

    /// Attempts to reconnect with exponential backoff.
    private func attemptReconnect() {
        guard reconnectAttempts < maxReconnectAttempts else {
            connectionState = .disconnected
            return
        }

        reconnectAttempts += 1
        let delay = baseReconnectDelay * pow(2.0, Double(reconnectAttempts - 1))

        Task {
            try? await Task.sleep(for: .seconds(delay))
            if connectionState != .connected {
                performConnect()
            }
        }
    }

    /// Handles an incoming WebSocket message.
    /// - Parameter text: The JSON message string.
    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            // Parse the wrapper to get event type
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let typeString = json?["type"] as? String,
                  let payloadDict = json?["payload"] else {
                return
            }

            let payloadData = try JSONSerialization.data(withJSONObject: payloadDict)

            switch WebSocketEvent(rawValue: typeString) {
            case .visitorJoined:
                let visitor = try decoder.decode(Visitor.self, from: payloadData)
                onVisitorJoined?(visitor)

            case .visitorLeft:
                if let visitorId = (payloadDict as? [String: Any])?["id"] as? String,
                   let uuid = UUID(uuidString: visitorId) {
                    onVisitorLeft?(uuid)
                }

            case .visitorUpdated:
                let visitor = try decoder.decode(Visitor.self, from: payloadData)
                onVisitorUpdated?(visitor)

            case .requestReceived:
                let request = try decoder.decode(Request.self, from: payloadData)
                onRequestReceived?(request)

            case .requestExpired:
                if let requestId = (payloadDict as? [String: Any])?["id"] as? String,
                   let uuid = UUID(uuidString: requestId) {
                    onRequestExpired?(uuid)
                }

            case .callStartedBroadcast:
                let call = try decoder.decode(ActiveCall.self, from: payloadData)
                onCallStarted?(call)

            case .callEndedBroadcast:
                if let conversationId = (payloadDict as? [String: Any])?["conversation_id"] as? String,
                   let uuid = UUID(uuidString: conversationId) {
                    onCallEnded?(uuid)
                }

            case .messageReceived:
                let message = try decoder.decode(Message.self, from: payloadData)
                onMessageReceived?(message)

            case .repAvailabilityChanged, .repPresenceChanged:
                let rep = try decoder.decode(Rep.self, from: payloadData)
                onRepUpdated?(rep)

            case .none:
                print("Unknown WebSocket event: \(typeString)")
            }
        } catch {
            print("Failed to parse WebSocket message: \(error)")
        }
    }

    // MARK: - WebSocketDelegate

    nonisolated func didReceive(event: Starscream.WebSocketEvent, client: any Starscream.WebSocketClient) {
        Task { @MainActor in
            switch event {
            case .connected:
                connectionState = .connected
                reconnectAttempts = 0

            case .disconnected(let reason, let code):
                print("WebSocket disconnected: \(reason) (code: \(code))")
                connectionState = .disconnected
                attemptReconnect()

            case .text(let text):
                handleMessage(text)

            case .binary(let data):
                if let text = String(data: data, encoding: .utf8) {
                    handleMessage(text)
                }

            case .error(let error):
                print("WebSocket error: \(String(describing: error))")
                connectionState = .disconnected
                attemptReconnect()

            case .cancelled:
                connectionState = .disconnected

            case .viabilityChanged(let viable):
                if !viable {
                    attemptReconnect()
                }

            case .reconnectSuggested(let suggested):
                if suggested {
                    attemptReconnect()
                }

            case .ping, .pong, .peerClosed:
                break
            }
        }
    }
}
