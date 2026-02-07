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
            // Load project details, visitors, and reps in parallel
            async let projectTask: Project = APIClient.shared.get(Endpoints.project(projectId: projectId))
            async let visitorsTask: VisitorListResponse = APIClient.shared.get(Endpoints.visitors(projectId: projectId))
            async let repsTask: [Rep] = APIClient.shared.get(Endpoints.reps(projectId: projectId))

            let (project, visitors, reps) = try await (projectTask, visitorsTask, repsTask)

            self.project = project
            self.browsingVisitors = visitors.browsing
            self.queuedRequests = visitors.queue
            self.activeCalls = visitors.inCall
            self.reps = reps

            // Find current rep by matching user ID
            if let currentUser = AuthManager.shared.currentUser {
                self.currentRep = reps.first { $0.userId == currentUser.id }
            }

            // Connect WebSocket and set up handlers
            setupWebSocketHandlers()
            webSocketManager.connect(projectId: projectId)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    /// Refreshes the dashboard data without reconnecting WebSocket.
    func refresh() async {
        guard let projectId else { return }

        do {
            // Reload visitors and reps in parallel
            async let visitorsTask: VisitorListResponse = APIClient.shared.get(Endpoints.visitors(projectId: projectId))
            async let repsTask: [Rep] = APIClient.shared.get(Endpoints.reps(projectId: projectId))

            let (visitors, reps) = try await (visitorsTask, repsTask)

            self.browsingVisitors = visitors.browsing
            self.queuedRequests = visitors.queue
            self.activeCalls = visitors.inCall
            self.reps = reps

            // Update current rep
            if let currentUser = AuthManager.shared.currentUser {
                self.currentRep = reps.first { $0.userId == currentUser.id }
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
                Endpoints.acceptRequest(projectId: projectId, requestId: requestId)
            )
            return response
        } catch {
            self.error = error
            return nil
        }
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
            // Remove from local queue
            queuedRequests.removeAll { $0.id == requestId }
        } catch {
            self.error = error
        }
    }

    /// Disconnects WebSocket when leaving the dashboard.
    func disconnect() {
        webSocketManager.disconnect()
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
            // Remove visitor from browsing if they're now in queue
            self?.browsingVisitors.removeAll { $0.id == request.visitor.id }
            self?.queuedRequests.append(request)
        }

        webSocketManager.onRequestExpired = { [weak self] requestId in
            self?.queuedRequests.removeAll { $0.id == requestId }
        }

        webSocketManager.onRequestCancelled = { [weak self] requestId in
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
    }
}

// MARK: - AcceptedCallResponse

/// Response when accepting a call request.
struct AcceptedCallResponse: Codable, Sendable {
    let conversationId: UUID
    let roomName: String
    let token: String
    let liveKitUrl: String
}
