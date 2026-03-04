//
//  ModerationModels.swift
//  LiveConnect
//
//  Created by Claude on 3/3/26.
//

import Foundation

/// Request body for reporting a visitor or their message.
struct ReportVisitorRequest: Encodable {
    let reason: String
    let messageContent: String?
}

/// Request body for blocking a visitor.
struct BlockVisitorRequest: Encodable {
    let reason: String?
}
