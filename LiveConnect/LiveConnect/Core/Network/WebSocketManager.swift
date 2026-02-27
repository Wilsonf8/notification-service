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
    case requestCancelled = "request_cancelled"
    case requestDismissed = "request_dismissed"
    case callStartedBroadcast = "call_started_broadcast"
    case callEndedBroadcast = "call_ended_broadcast"
    case messageReceived = "message_received"
    case repAvailabilityChanged = "rep_availability_changed"
    case repPresenceChanged = "rep_presence_changed"
    case conversationStarted = "conversation_started"
    case requestAcceptedByOther = "request_accepted_by_other"
}

// MARK: - WebSocket Event DTOs (match backend flat event structure)

/// DTO for visitor_joined event from backend.
private struct VisitorJoinedDTO: Codable {
    let visitorId: UUID
    let name: String?
    let email: String?
    let currentPage: String?
    let joinedAt: Date
    let isFirstVisit: Bool?
    let previousVisitEndedAt: Date?
    let totalVisitCount: Int?
}

/// DTO for visitor_left event from backend.
private struct VisitorLeftDTO: Codable {
    let visitorId: UUID
    let leftAt: Date
}

/// DTO for visitor_updated event from backend.
private struct VisitorUpdatedDTO: Codable {
    let visitorId: UUID
    let name: String?
    let email: String?
    let currentPage: String?
    let currentPageTitle: String?
    let isConnected: Bool?
    let isFirstVisit: Bool?
    let previousVisitEndedAt: Date?
    let totalVisitCount: Int?
}

/// DTO for request_received event from backend.
private struct RequestReceivedDTO: Codable {
    let requestId: UUID
    let visitorId: UUID
    let visitorName: String?
    let direction: String
    let expiresAt: Date
}

/// DTO for request_expired event from backend.
private struct RequestExpiredDTO: Codable {
    let requestId: UUID
}

/// DTO for request_cancelled event from backend.
private struct RequestCancelledDTO: Codable {
    let requestId: UUID
}

/// DTO for request_dismissed event from backend.
private struct RequestDismissedDTO: Codable {
    let requestId: UUID
}

/// DTO for request_accepted_by_other event from backend.
private struct RequestAcceptedByOtherDTO: Codable {
    let requestId: UUID
    let repId: UUID
    let repName: String
}

/// DTO for call_ended_broadcast event from backend.
private struct CallEndedBroadcastDTO: Codable {
    let conversationId: UUID
}

/// DTO for conversation_started event from backend.
private struct ConversationStartedDTO: Codable {
    let conversationId: UUID
    let visitorId: UUID
    let roomName: String
    let token: String
    let liveKitUrl: String
}

/// DTO for message_received event from backend.
private struct MessageReceivedDTO: Codable {
    let messageId: UUID
    let conversationId: UUID
    let senderType: MessageSenderType
    let senderName: String?
    let content: String
    let sentAt: Date?
}

/// Represents an active call from WebSocket events.
struct ActiveCall: Codable, Identifiable, Sendable {
    let conversationId: UUID
    let visitorId: UUID
    let visitorName: String?
    let repId: UUID
    let repUserId: UUID
    let repName: String
    let startedAt: Date?

    var id: UUID { conversationId }
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
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            if let date = formatter.date(from: dateString) {
                return date
            }
            // Fallback for dates without fractional seconds
            let fallbackFormatter = ISO8601DateFormatter()
            fallbackFormatter.formatOptions = [.withInternetDateTime]
            if let date = fallbackFormatter.date(from: dateString) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(dateString)"
            )
        }
        return decoder
    }()

    /// Callbacks for different event types.
    var onVisitorJoined: ((Visitor) -> Void)?
    var onVisitorLeft: ((UUID) -> Void)?
    var onVisitorUpdated: ((Visitor) -> Void)?
    var onRequestReceived: ((Request) -> Void)?
    var onRequestExpired: ((UUID) -> Void)?
    var onRequestCancelled: ((UUID) -> Void)?
    var onRequestDismissed: ((UUID) -> Void)?
    var onCallStarted: ((ActiveCall) -> Void)?
    var onCallEnded: ((UUID) -> Void)?
    var onMessageReceived: ((Message) -> Void)?
    var onRepUpdated: ((Rep) -> Void)?
    var onConversationStarted: ((AcceptedCallResponse) -> Void)?
    var onRequestAcceptedByOther: ((UUID) -> Void)?

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

        // Build WebSocket URL with token as query parameter
        // (more reliable than Authorization header for WebSocket upgrade)
        let baseUrl = Endpoints.webSocket(projectId: projectId)
        var urlString = baseUrl

        let token = KeychainService.shared.getToken()
        if let token {
            // URL-encode the token to handle any special characters
            if let encodedToken = token.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
                urlString += "?token=\(encodedToken)"
            } else {
                urlString += "?token=\(token)"
            }
        }

        guard let url = URL(string: urlString) else {
            print("WebSocket: Invalid URL")
            return
        }

        let request = URLRequest(url: url)

        connectionState = reconnectAttempts > 0 ? .reconnecting : .connecting

        print("WebSocket: Connecting to \(baseUrl)")
        print("WebSocket: Token present: \(token != nil), Token length: \(token?.count ?? 0)")
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
            // Parse the event type from flat JSON structure (no payload wrapper)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let typeString = json?["type"] as? String else {
                print("WebSocket: Missing type field in message")
                return
            }

            // Parse the full event data based on type
            switch WebSocketEvent(rawValue: typeString) {
            case .visitorJoined:
                let dto = try decoder.decode(VisitorJoinedDTO.self, from: data)
                let visitor = Visitor(
                    id: dto.visitorId,
                    visitorId: dto.visitorId.uuidString,
                    name: dto.name,
                    email: dto.email,
                    currentPage: dto.currentPage,
                    isConnected: true,
                    isPingable: true,
                    hasActiveRequest: false,
                    isFirstVisit: dto.isFirstVisit,
                    previousVisitEndedAt: dto.previousVisitEndedAt,
                    totalVisitCount: dto.totalVisitCount
                )
                onVisitorJoined?(visitor)

            case .visitorLeft:
                let dto = try decoder.decode(VisitorLeftDTO.self, from: data)
                onVisitorLeft?(dto.visitorId)

            case .visitorUpdated:
                let dto = try decoder.decode(VisitorUpdatedDTO.self, from: data)
                let isConnected = dto.isConnected ?? true
                let visitor = Visitor(
                    id: dto.visitorId,
                    visitorId: dto.visitorId.uuidString,
                    name: dto.name,
                    email: dto.email,
                    currentPage: dto.currentPage,
                    isConnected: isConnected,
                    isPingable: isConnected,  // Pingable only when connected
                    hasActiveRequest: false,
                    isFirstVisit: dto.isFirstVisit,
                    previousVisitEndedAt: dto.previousVisitEndedAt,
                    totalVisitCount: dto.totalVisitCount
                )
                onVisitorUpdated?(visitor)

            case .requestReceived:
                let dto = try decoder.decode(RequestReceivedDTO.self, from: data)
                // Create minimal visitor for the request
                let visitor = Visitor(
                    id: dto.visitorId,
                    visitorId: dto.visitorId.uuidString,
                    name: dto.visitorName,
                    email: nil,
                    currentPage: nil,
                    isConnected: true,
                    isPingable: false,
                    hasActiveRequest: true,
                    isFirstVisit: nil,
                    previousVisitEndedAt: nil,
                    totalVisitCount: nil
                )
                let request = Request(
                    id: dto.requestId,
                    visitor: visitor,
                    direction: RequestDirection(rawValue: dto.direction) ?? .userToReps,
                    status: .pending,
                    expiresAt: dto.expiresAt
                )
                onRequestReceived?(request)

            case .requestExpired:
                let dto = try decoder.decode(RequestExpiredDTO.self, from: data)
                onRequestExpired?(dto.requestId)

            case .requestCancelled:
                let dto = try decoder.decode(RequestCancelledDTO.self, from: data)
                onRequestCancelled?(dto.requestId)

            case .requestDismissed:
                let dto = try decoder.decode(RequestDismissedDTO.self, from: data)
                onRequestDismissed?(dto.requestId)

            case .requestAcceptedByOther:
                let dto = try decoder.decode(RequestAcceptedByOtherDTO.self, from: data)
                onRequestAcceptedByOther?(dto.requestId)

            case .callStartedBroadcast:
                let call = try decoder.decode(ActiveCall.self, from: data)
                onCallStarted?(call)

            case .callEndedBroadcast:
                let dto = try decoder.decode(CallEndedBroadcastDTO.self, from: data)
                onCallEnded?(dto.conversationId)

            case .conversationStarted:
                let dto = try decoder.decode(ConversationStartedDTO.self, from: data)
                let response = AcceptedCallResponse(
                    conversationId: dto.conversationId,
                    visitorId: dto.visitorId,
                    roomName: dto.roomName,
                    token: dto.token,
                    liveKitUrl: dto.liveKitUrl
                )
                onConversationStarted?(response)

            case .messageReceived:
                let dto = try decoder.decode(MessageReceivedDTO.self, from: data)
                let message = Message(
                    id: dto.messageId,
                    senderType: dto.senderType,
                    senderName: dto.senderName,
                    content: dto.content,
                    createdAt: dto.sentAt
                )
                onMessageReceived?(message)

            case .repAvailabilityChanged, .repPresenceChanged:
                let rep = try decoder.decode(Rep.self, from: data)
                onRepUpdated?(rep)

            case .none:
                print("WebSocket: Unknown event type: \(typeString)")
            }
        } catch {
            print("WebSocket: Failed to parse message: \(error)")
            print("WebSocket: Raw message: \(text)")
        }
    }

    // MARK: - WebSocketDelegate

    nonisolated func didReceive(event: Starscream.WebSocketEvent, client: any Starscream.WebSocketClient) {
        Task { @MainActor in
            switch event {
            case .connected:
                print("WebSocket: Connected successfully")
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
