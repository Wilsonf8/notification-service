//
//  ProjectDashboardViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Response from the visitors endpoint.
struct VisitorListResponse: Codable, Sendable {
    let browsing: [Visitor]
    let queue: [Request]
    let inCall: [ActiveCall]
}

/// View model for the project dashboard.
@MainActor
@Observable
final class ProjectDashboardViewModel {
    /// The current project.
    private(set) var project: Project?

    /// Visitors currently browsing (not in queue or call).
    private(set) var browsingVisitors: [Visitor] = []

    /// Pending requests in the queue.
    private(set) var queuedRequests: [Request] = []

    /// Active calls.
    private(set) var activeCalls: [ActiveCall] = []

    /// Reps for this project.
    private(set) var reps: [Rep] = []

    /// The current rep (the logged-in user).
    private(set) var currentRep: Rep?

    /// Whether data is loading.
    private(set) var isLoading = false

    /// The last error that occurred.
    private(set) var error: Error?

    /// Error message when accepting a request fails (e.g., another rep accepted first).
    private(set) var acceptError: String?

    /// Incoming call from WebSocket (when visitor accepts rep's ping).
    private(set) var incomingCall: AcceptedCallResponse?

    /// Visitors from dismissed requests, keyed by requestId.
    /// Used to restore visitors to browsing when cancel/expire arrives after dismiss.
    private var dismissedRequestVisitors: [UUID: Visitor] = [:]

    /// Current project ID.
    private var projectId: UUID?

    /// WebSocket manager for real-time updates.
    let webSocketManager = WebSocketManager()

    /// Whether the rep is available.
    var isAvailable: Bool {
        currentRep?.availability == .available
    }

    /// Whether WebSocket is connected.
    var isConnected: Bool {
        webSocketManager.isConnected
    }

    // MARK: - Public Methods

    /// Loads the dashboard for a project.
    /// - Parameter projectId: The project UUID.
    func loadDashboard(projectId: UUID) async {
        self.projectId = projectId
        isLoading = true
        error = nil

        do {
            // Load project details and reps first (both work for org members)
            async let projectTask: Project = APIClient.shared.get(Endpoints.project(projectId: projectId))
            async let repsTask: [Rep] = APIClient.shared.get(Endpoints.reps(projectId: projectId))

            let (project, reps) = try await (projectTask, repsTask)

            self.project = project
            self.reps = reps

            // Find current rep by matching user ID
            if let currentUser = AuthManager.shared.currentUser {
                self.currentRep = reps.first { $0.userId == currentUser.id }
            }

            // Only load visitors and connect WebSocket if user is a rep
            if currentRep != nil {
                let visitors: VisitorListResponse = try await APIClient.shared.get(
                    Endpoints.visitors(projectId: projectId)
                )
                self.browsingVisitors = visitors.browsing
                self.queuedRequests = visitors.queue
                self.activeCalls = visitors.inCall

                setupWebSocketHandlers()
                webSocketManager.connect(projectId: projectId)
            }
        } catch {
            self.error = error
        }

        isLoading = false
    }

    /// Refreshes the dashboard data without reconnecting WebSocket.
    func refresh() async {
        guard let projectId else { return }

        do {
            // Always reload reps
            let reps: [Rep] = try await APIClient.shared.get(Endpoints.reps(projectId: projectId))
            self.reps = reps

            // Update current rep
            if let currentUser = AuthManager.shared.currentUser {
                self.currentRep = reps.first { $0.userId == currentUser.id }
            }

            // Only reload visitors if user is a rep
            if currentRep != nil {
                let visitors: VisitorListResponse = try await APIClient.shared.get(
                    Endpoints.visitors(projectId: projectId)
                )
                self.browsingVisitors = visitors.browsing
                self.queuedRequests = visitors.queue
                self.activeCalls = visitors.inCall
                self.dismissedRequestVisitors.removeAll()
            }
        } catch {
            self.error = error
        }
    }

    /// Toggles the rep's availability.
    func toggleAvailability() async {
        guard let projectId else { return }

        let newAvailability: RepAvailability = isAvailable ? .unavailable : .available

        do {
            try await APIClient.shared.put(
                Endpoints.availability(projectId: projectId),
                body: ["availability": newAvailability.rawValue]
            )

            // Update local state
            if let rep = currentRep {
                currentRep = Rep(
                    id: rep.id,
                    userId: rep.userId,
                    name: rep.name,
                    email: rep.email,
                    availability: newAvailability,
                    presence: rep.presence
                )
            }
        } catch {
            self.error = error
        }
    }

    /// Pings a visitor.
    /// - Parameter visitorId: The visitor UUID.
    func pingVisitor(_ visitorId: UUID) async {
        guard let projectId else { return }

        do {
            try await APIClient.shared.post(
                Endpoints.pingVisitor(projectId: projectId, visitorId: visitorId),
                body: Optional<String>.none
            )
        } catch {
            self.error = error
        }
    }

    /// Accepts a request.
    /// - Parameter requestId: The request UUID.
    /// - Returns: The conversation details for joining the call.
    func acceptRequest(_ requestId: UUID) async -> AcceptedCallResponse? {
        guard let projectId else { return nil }

        do {
            let response: AcceptedCallResponse = try await APIClient.shared.post(
                Endpoints.acceptRequest(projectId: projectId, requestId: requestId, deviceSessionId: webSocketManager.deviceSessionId)
            )
            return response
        } catch {
            // If accept fails (e.g., another rep accepted first), remove request from queue
            // and show a specific error message
            queuedRequests.removeAll { $0.id == requestId }
            acceptError = "Another rep already accepted this call"
            return nil
        }
    }

    /// Clears the accept error after it's been shown.
    func clearAcceptError() {
        acceptError = nil
    }

    /// Dismisses a request.
    /// - Parameter requestId: The request UUID.
    func dismissRequest(_ requestId: UUID) async {
        guard let projectId else { return }

        do {
            try await APIClient.shared.post(
                Endpoints.dismissRequest(projectId: projectId, requestId: requestId),
                body: Optional<String>.none
            )
            // Save visitor data before removing so cancel/expire can restore to browsing
            if let request = queuedRequests.first(where: { $0.id == requestId }) {
                dismissedRequestVisitors[requestId] = request.visitor
            }
            queuedRequests.removeAll { $0.id == requestId }
        } catch {
            self.error = error
        }
    }

    /// Loads visit statistics and history for a visitor.
    /// - Parameter visitorId: The visitor's UUID.
    /// - Returns: The visitor detail response, or nil on failure.
    func loadVisitorVisits(visitorId: UUID) async -> VisitorDetailResponse? {
        guard let projectId else { return nil }
        do {
            return try await APIClient.shared.get(
                Endpoints.visitorVisits(projectId: projectId, visitorId: visitorId)
            )
        } catch {
            print("Failed to load visitor visits: \(error)")
            return nil
        }
    }

    /// Disconnects WebSocket when leaving the dashboard.
    func disconnect() {
        webSocketManager.disconnect()
    }

    /// Clears the incoming call after it's been handled.
    func clearIncomingCall() {
        incomingCall = nil
    }

    // MARK: - Private Methods

    /// Sets up WebSocket event handlers.
    private func setupWebSocketHandlers() {
        webSocketManager.onVisitorJoined = { [weak self] visitor in
            // Remove any existing entry to prevent duplicates (e.g., visitor leaves and rejoins)
            self?.browsingVisitors.removeAll { $0.id == visitor.id }
            self?.browsingVisitors.append(visitor)
        }

        webSocketManager.onVisitorLeft = { [weak self] visitorId in
            self?.browsingVisitors.removeAll { $0.id == visitorId }
            // Also remove any pending requests from this visitor
            self?.queuedRequests.removeAll { $0.visitor.id == visitorId }
            // Also remove from active calls if visitor disconnected
            self?.activeCalls.removeAll { $0.visitorId == visitorId }
        }

        webSocketManager.onVisitorUpdated = { [weak self] visitor in
            if let index = self?.browsingVisitors.firstIndex(where: { $0.id == visitor.id }) {
                self?.browsingVisitors[index] = visitor
            }
        }

        webSocketManager.onRequestReceived = { [weak self] request in
            guard let self else { return }
            // Capture browsing data before removing the visitor
            let browsingVisitor = self.browsingVisitors.first(where: { $0.id == request.visitor.id })
            // Remove visitor from browsing since they're now in queue
            self.browsingVisitors.removeAll { $0.id == request.visitor.id }
            // Enrich request visitor with browsing metadata so it's preserved if the request is cancelled
            if let browsingVisitor {
                let enrichedVisitor = Visitor(
                    id: request.visitor.id,
                    visitorId: request.visitor.visitorId,
                    name: request.visitor.name,
                    email: browsingVisitor.email,
                    currentPage: browsingVisitor.currentPage,
                    isConnected: request.visitor.isConnected,
                    isPingable: request.visitor.isPingable,
                    hasActiveRequest: request.visitor.hasActiveRequest,
                    isFirstVisit: browsingVisitor.isFirstVisit,
                    previousVisitEndedAt: browsingVisitor.previousVisitEndedAt,
                    totalVisitCount: browsingVisitor.totalVisitCount
                )
                let enrichedRequest = Request(
                    id: request.id,
                    visitor: enrichedVisitor,
                    direction: request.direction,
                    status: request.status,
                    expiresAt: request.expiresAt
                )
                self.queuedRequests.append(enrichedRequest)
            } else {
                self.queuedRequests.append(request)
            }
        }

        webSocketManager.onRequestExpired = { [weak self] requestId in
            guard let self else { return }
            if let request = self.queuedRequests.first(where: { $0.id == requestId }) {
                let visitor = Visitor(
                    id: request.visitor.id,
                    visitorId: request.visitor.visitorId,
                    name: request.visitor.name,
                    email: request.visitor.email,
                    currentPage: request.visitor.currentPage,
                    isConnected: true,
                    isPingable: true,
                    hasActiveRequest: false,
                    isFirstVisit: request.visitor.isFirstVisit,
                    previousVisitEndedAt: request.visitor.previousVisitEndedAt,
                    totalVisitCount: request.visitor.totalVisitCount
                )
                self.browsingVisitors.append(visitor)
            } else if let visitor = self.dismissedRequestVisitors.removeValue(forKey: requestId) {
                let restoredVisitor = Visitor(
                    id: visitor.id,
                    visitorId: visitor.visitorId,
                    name: visitor.name,
                    email: visitor.email,
                    currentPage: visitor.currentPage,
                    isConnected: true,
                    isPingable: true,
                    hasActiveRequest: false,
                    isFirstVisit: visitor.isFirstVisit,
                    previousVisitEndedAt: visitor.previousVisitEndedAt,
                    totalVisitCount: visitor.totalVisitCount
                )
                self.browsingVisitors.append(restoredVisitor)
            }
            self.queuedRequests.removeAll { $0.id == requestId }
        }

        webSocketManager.onRequestCancelled = { [weak self] requestId in
            guard let self else { return }
            if let request = self.queuedRequests.first(where: { $0.id == requestId }) {
                // Normal path: request in queue, move visitor to browsing
                let visitor = Visitor(
                    id: request.visitor.id,
                    visitorId: request.visitor.visitorId,
                    name: request.visitor.name,
                    email: request.visitor.email,
                    currentPage: request.visitor.currentPage,
                    isConnected: true,
                    isPingable: true,
                    hasActiveRequest: false,
                    isFirstVisit: request.visitor.isFirstVisit,
                    previousVisitEndedAt: request.visitor.previousVisitEndedAt,
                    totalVisitCount: request.visitor.totalVisitCount
                )
                self.browsingVisitors.append(visitor)
            } else if let visitor = self.dismissedRequestVisitors.removeValue(forKey: requestId) {
                // Dismissed path: request was already removed, use saved visitor
                let restoredVisitor = Visitor(
                    id: visitor.id,
                    visitorId: visitor.visitorId,
                    name: visitor.name,
                    email: visitor.email,
                    currentPage: visitor.currentPage,
                    isConnected: true,
                    isPingable: true,
                    hasActiveRequest: false,
                    isFirstVisit: visitor.isFirstVisit,
                    previousVisitEndedAt: visitor.previousVisitEndedAt,
                    totalVisitCount: visitor.totalVisitCount
                )
                self.browsingVisitors.append(restoredVisitor)
            }
            self.queuedRequests.removeAll { $0.id == requestId }
        }

        webSocketManager.onRequestDismissed = { [weak self] requestId in
            guard let self else { return }
            // Save visitor data before removing so cancel/expire can restore to browsing
            if let request = self.queuedRequests.first(where: { $0.id == requestId }) {
                self.dismissedRequestVisitors[requestId] = request.visitor
            }
            // Just remove from queue — do NOT move visitor to browsing
            // (visitor still has an active request visible to other reps)
            self.queuedRequests.removeAll { $0.id == requestId }
        }

        webSocketManager.onRequestAcceptedByOther = { [weak self] requestId in
            self?.queuedRequests.removeAll { $0.id == requestId }
        }

        webSocketManager.onCallStarted = { [weak self] call in
            // Remove from queue if present
            self?.queuedRequests.removeAll { $0.visitor.id == call.visitorId }
            // Remove from browsing if present
            self?.browsingVisitors.removeAll { $0.id == call.visitorId }
            // Add to active calls
            self?.activeCalls.append(call)
        }

        webSocketManager.onCallEnded = { [weak self] conversationId in
            self?.activeCalls.removeAll { $0.conversationId == conversationId }
        }

        webSocketManager.onRepUpdated = { [weak self] rep in
            if let index = self?.reps.firstIndex(where: { $0.id == rep.id }) {
                self?.reps[index] = rep
            }
            if self?.currentRep?.id == rep.id {
                self?.currentRep = rep
            }
        }

        webSocketManager.onConversationStarted = { [weak self] response in
            if response.originDeviceSessionId != nil {
                // Accept-initiated: HTTP response already opened the call on the accepting device.
                // All other devices should ignore this event.
                return
            }
            // No originDeviceSessionId means visitor-initiated (e.g., visitorAcceptsPing) — open on all devices
            self?.incomingCall = response
        }
    }
}

// MARK: - AcceptedCallResponse

/// Response when accepting a call request.
struct AcceptedCallResponse: Codable, Sendable, Equatable {
    let conversationId: UUID
    let visitorId: UUID?
    let roomName: String
    let token: String
    let liveKitUrl: String
    let originDeviceSessionId: String?
}
