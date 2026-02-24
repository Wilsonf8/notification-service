//
//  CrmModels.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import Foundation

/// Pipeline stage for CRM visitors.
enum PipelineStage: String, Codable, Sendable, CaseIterable {
    case new = "NEW"
    case engaged = "ENGAGED"
    case won = "WON"

    /// Human-readable display label.
    var label: String {
        switch self {
        case .new: return "New"
        case .engaged: return "Engaged"
        case .won: return "Won"
        }
    }
}

/// A CRM tag with a name and color.
struct CrmTag: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let name: String
    let color: String
}

/// A visitor in the CRM list (lightweight).
struct CrmVisitorListItem: Codable, Identifiable, Sendable {
    let id: UUID
    let name: String?
    let email: String?
    let countryCode: String?
    let country: String?
    let city: String?
    let lastSeenAt: Date
    let visitCount: Int
    let leadScore: Int
    let pipelineStage: PipelineStage
    let assignedRep: Rep?
    let tags: [CrmTag]

    /// Display name, falling back to email or "Anonymous".
    var displayName: String {
        if let name, !name.isEmpty { return name }
        if let email, !email.isEmpty { return email }
        return "Anonymous"
    }

    /// Formatted location string (e.g., "New York, US").
    var locationString: String? {
        let parts = [city, countryCode].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }
}

/// Paginated response for the CRM visitors list.
struct CrmVisitorListResponse: Codable, Sendable {
    let visitors: [CrmVisitorListItem]
    let totalElements: Int
    let totalPages: Int
    let page: Int
    let size: Int
}

/// Full CRM visitor detail.
struct CrmVisitorDetail: Codable, Identifiable, Sendable {
    let id: UUID
    let visitorId: String
    let name: String?
    let email: String?
    let countryCode: String?
    let country: String?
    let region: String?
    let city: String?
    let browserName: String?
    let browserVersion: String?
    let osName: String?
    let osVersion: String?
    let deviceType: String?
    let ipAddress: String?
    let firstSeenAt: Date?
    let lastSeenAt: Date
    var pipelineStage: PipelineStage
    let leadScore: Int
    var assignedRep: Rep?
    var tags: [CrmTag]
    let visitStats: VisitorVisitStats
    let engagementStats: VisitorEngagementStats

    /// Display name, falling back to email or "Anonymous".
    var displayName: String {
        if let name, !name.isEmpty { return name }
        if let email, !email.isEmpty { return email }
        return "Anonymous"
    }

    /// Formatted location string (e.g., "New York, US").
    var locationString: String? {
        let parts = [city, country].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    /// Formatted browser string (e.g., "Safari 17.2").
    var browserString: String? {
        guard let browserName else { return nil }
        if let browserVersion {
            return "\(browserName) \(browserVersion)"
        }
        return browserName
    }

    /// Formatted OS string (e.g., "iOS 18.0").
    var osString: String? {
        guard let osName else { return nil }
        if let osVersion {
            return "\(osName) \(osVersion)"
        }
        return osName
    }

    /// Formatted device string (e.g., "iPhone / iOS 18.0").
    var deviceString: String? {
        let parts = [deviceType, osString].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " / ")
    }
}

/// A note on a CRM visitor.
struct VisitorNote: Codable, Identifiable, Sendable {
    let id: UUID
    let content: String
    let authorName: String
    let authorRepId: UUID
    let createdAt: Date
}

/// Paginated response for visitor notes.
struct VisitorNotesResponse: Codable, Sendable {
    let content: [VisitorNote]
    let totalPages: Int
    let totalElements: Int
}

/// A unified timeline event.
struct TimelineEvent: Codable, Identifiable, Sendable {
    let type: String
    let id: String
    let timestamp: Date
    let data: [String: AnyCodableValue]

    /// The event type as an enum case, or nil if unrecognized.
    var eventType: TimelineEventType? {
        TimelineEventType(rawValue: type)
    }
}

/// Known timeline event types.
enum TimelineEventType: String, Sendable {
    case visit = "VISIT"
    case pageView = "PAGE_VIEW"
    case call = "CALL"
    case contactForm = "CONTACT_FORM"
    case note = "NOTE"
    case request = "REQUEST"

    /// SF Symbol name for the event type.
    var iconName: String {
        switch self {
        case .visit: return "globe"
        case .pageView: return "doc.text"
        case .call: return "video"
        case .contactForm: return "doc.plaintext"
        case .note: return "note.text"
        case .request: return "bell"
        }
    }

    /// Display label for the event type.
    var label: String {
        switch self {
        case .visit: return "Visit"
        case .pageView: return "Page View"
        case .call: return "Call"
        case .contactForm: return "Contact Form"
        case .note: return "Note"
        case .request: return "Request"
        }
    }
}

/// Paginated response for timeline events.
struct TimelineResponse: Codable, Sendable {
    let events: [TimelineEvent]
    let totalElements: Int
    let totalPages: Int
    let page: Int
}

/// Paginated response for CRM conversations.
struct CrmConversationsResponse: Codable, Sendable {
    let conversations: [Conversation]
    let totalElements: Int
    let totalPages: Int
    let size: Int
    let page: Int
}

// MARK: - Request DTOs

/// Request body to update a visitor's pipeline stage.
struct UpdateStageRequest: Encodable, Sendable {
    let stage: String
}

/// Request body to assign a rep to a visitor.
struct AssignRepRequest: Encodable, Sendable {
    let repId: UUID
}

/// Request body to add a tag to a visitor.
struct AddTagRequest: Encodable, Sendable {
    let tagId: UUID
}

/// Request body to add a note to a visitor.
struct AddNoteRequest: Encodable, Sendable {
    let content: String
}

// MARK: - AnyCodableValue

/// A type-erased Codable value for flexible JSON data fields.
enum AnyCodableValue: Codable, Sendable, Hashable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Int.self) {
            self = .int(value)
        } else if let value = try? container.decode(Double.self) {
            self = .double(value)
        } else if container.decodeNil() {
            self = .null
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .int(let value): try container.encode(value)
        case .double(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }

    /// Returns the underlying string value, or nil.
    var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }

    /// Returns the underlying int value, or nil.
    var intValue: Int? {
        if case .int(let value) = self { return value }
        return nil
    }
}
