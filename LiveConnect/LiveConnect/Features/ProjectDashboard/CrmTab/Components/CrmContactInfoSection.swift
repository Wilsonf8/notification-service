//
//  CrmContactInfoSection.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Displays editable contact fields (name, email, phone) with auto-save,
/// followed by read-only info rows (location, device, browser, IP, first seen).
struct CrmContactInfoSection: View {
    /// The visitor detail to display.
    let detail: CrmVisitorDetail

    /// Callback to save contact changes. Parameters are name, email, phone (nil = unchanged).
    var onSave: ((String?, String?, String?) async throws -> Void)?

    // Editable field values
    @State private var nameValue = ""
    @State private var emailValue = ""
    @State private var phoneValue = ""

    // Per-field save status
    @State private var nameSaveStatus: SaveStatus = .idle
    @State private var emailSaveStatus: SaveStatus = .idle
    @State private var phoneSaveStatus: SaveStatus = .idle

    // Focus tracking for auto-save on blur
    @FocusState private var focusedField: ContactField?

    /// Which contact field is focused.
    private enum ContactField: Hashable {
        case name, email, phone
    }

    /// Save status for auto-save indicator.
    private enum SaveStatus {
        case idle, saving, saved, error
    }

    var body: some View {
        VStack(spacing: 12) {
            // Editable contact fields
            contactField(
                icon: "person.fill",
                placeholder: "Name",
                text: $nameValue,
                field: .name,
                status: nameSaveStatus
            )

            contactField(
                icon: "envelope.fill",
                placeholder: "Email",
                text: $emailValue,
                field: .email,
                status: emailSaveStatus
            )

            contactField(
                icon: "phone.fill",
                placeholder: "Phone",
                text: $phoneValue,
                field: .phone,
                status: phoneSaveStatus
            )

            // Read-only info rows
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
        .onAppear {
            nameValue = detail.name ?? ""
            emailValue = detail.email ?? ""
            phoneValue = detail.phone ?? ""
        }
        .onChange(of: focusedField) { oldField, _ in
            guard let oldField else { return }
            saveFieldIfChanged(oldField)
        }
    }

    // MARK: - Editable Contact Field

    /// Renders an editable contact field row with icon and save status indicator.
    private func contactField(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        field: ContactField,
        status: SaveStatus
    ) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 20)

            TextField(placeholder, text: text)
                .textFieldStyle(.plain)
                .font(.subheadline)
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(Color.white.opacity(0.1))
                .focused($focusedField, equals: field)

            saveStatusIcon(status)
        }
    }

    /// Shows a small indicator for save status.
    @ViewBuilder
    private func saveStatusIcon(_ status: SaveStatus) -> some View {
        switch status {
        case .idle:
            EmptyView()
        case .saving:
            ProgressView()
                .scaleEffect(0.6)
                .tint(.secondary)
        case .saved:
            Image(systemName: "checkmark")
                .font(.caption2)
                .foregroundStyle(.green)
        case .error:
            Text("Failed")
                .font(.caption2)
                .foregroundStyle(.red)
        }
    }

    // MARK: - Auto-Save

    /// Saves a field if its value differs from the original detail.
    private func saveFieldIfChanged(_ field: ContactField) {
        let localValue: String
        let originalValue: String

        switch field {
        case .name:
            localValue = nameValue
            originalValue = detail.name ?? ""
        case .email:
            localValue = emailValue
            originalValue = detail.email ?? ""
        case .phone:
            localValue = phoneValue
            originalValue = detail.phone ?? ""
        }

        guard localValue != originalValue else { return }

        switch field {
        case .name: nameSaveStatus = .saving
        case .email: emailSaveStatus = .saving
        case .phone: phoneSaveStatus = .saving
        }

        Task {
            do {
                switch field {
                case .name:
                    try await onSave?(localValue, nil, nil)
                    nameSaveStatus = .saved
                case .email:
                    try await onSave?(nil, localValue, nil)
                    emailSaveStatus = .saved
                case .phone:
                    try await onSave?(nil, nil, localValue)
                    phoneSaveStatus = .saved
                }

                try? await Task.sleep(for: .seconds(2))

                switch field {
                case .name: nameSaveStatus = .idle
                case .email: emailSaveStatus = .idle
                case .phone: phoneSaveStatus = .idle
                }
            } catch {
                switch field {
                case .name: nameSaveStatus = .error
                case .email: emailSaveStatus = .error
                case .phone: phoneSaveStatus = .error
                }
            }
        }
    }

    // MARK: - Read-Only Info Row

    /// Renders a single read-only info row with icon, label, and value.
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
