//
//  CrmContactInfoSection.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Displays contact information rows for a CRM visitor.
struct CrmContactInfoSection: View {
    /// The visitor detail to display.
    let detail: CrmVisitorDetail

    var body: some View {
        VStack(spacing: 12) {
            if let email = detail.email {
                infoRow(icon: "envelope", label: "Email", value: email)
            }

            if let location = detail.locationString {
                infoRow(icon: "mappin.and.ellipse", label: "Location", value: location)
            }

            if let device = detail.deviceString {
                infoRow(icon: "desktopcomputer", label: "Device", value: device)
            }

            if let browser = detail.browserString {
                infoRow(icon: "globe", label: "Browser", value: browser)
            }

            if let ip = detail.ipAddress {
                infoRow(icon: "network", label: "IP", value: ip)
            }

            if let firstSeen = detail.firstSeenAt {
                infoRow(icon: "calendar", label: "First Seen", value: formatDate(firstSeen))
            }
        }
    }

    /// Renders a single info row with icon, label, and value.
    private func infoRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.secondary)
                .frame(width: 24)

            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
                .lineLimit(1)
        }
    }

    /// Formats a date for display.
    /// - Parameter date: The date to format.
    /// - Returns: Formatted string (e.g., "Feb 1, 2026").
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
}
