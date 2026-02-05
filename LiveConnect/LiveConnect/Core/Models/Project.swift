//
//  Project.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// Represents a project within an organization.
struct Project: Codable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let description: String?
    let type: ProjectType

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case type
    }
}

/// The type of project.
enum ProjectType: String, Codable, Sendable {
    case liveconnect = "LIVECONNECT"
}
