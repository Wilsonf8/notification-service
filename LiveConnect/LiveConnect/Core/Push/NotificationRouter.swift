//
//  NotificationRouter.swift
//  LiveConnect
//
//  Created by Claude on 2/10/26.
//

import Foundation

/// Handles navigation from push notification taps.
@MainActor
@Observable
final class NotificationRouter {
    /// Shared singleton instance.
    static let shared = NotificationRouter()

    /// Pending navigation from a notification tap.
    var pendingNavigation: NotificationNavigation?

    private init() {}

    /// Processes a notification payload and sets up navigation.
    /// - Parameter userInfo: The notification payload.
    func handleNotification(_ userInfo: [AnyHashable: Any]) {
        guard let type = userInfo["type"] as? String else {
            print("NotificationRouter: Missing type in payload")
            return
        }

        print("NotificationRouter: Handling notification type: \(type)")

        switch type {
        case "visitor_presence":
            if let projectIdString = userInfo["projectId"] as? String,
               let projectId = UUID(uuidString: projectIdString),
               let visitorIdString = userInfo["visitorId"] as? String,
               let visitorId = UUID(uuidString: visitorIdString) {
                pendingNavigation = .visitorDetail(projectId: projectId, visitorId: visitorId)
            }

        case "visitor_request":
            if let projectIdString = userInfo["projectId"] as? String,
               let projectId = UUID(uuidString: projectIdString),
               let requestIdString = userInfo["requestId"] as? String,
               let requestId = UUID(uuidString: requestIdString) {
                pendingNavigation = .acceptRequest(projectId: projectId, requestId: requestId)
            }

        default:
            print("NotificationRouter: Unknown notification type: \(type)")
        }
    }

    /// Clears the pending navigation after it's been handled.
    func clearPendingNavigation() {
        pendingNavigation = nil
    }
}

/// Types of navigation that can be triggered by notifications.
enum NotificationNavigation: Equatable {
    /// Navigate to visitor detail view.
    case visitorDetail(projectId: UUID, visitorId: UUID)

    /// Show request accept sheet.
    case acceptRequest(projectId: UUID, requestId: UUID)
}
