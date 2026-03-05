//
//  CreateOrganizationSheet.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// Sheet for creating a new team organization.
struct CreateOrganizationSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var isCreating = false
    @State private var error: String?

    /// Callback when an organization is successfully created.
    var onCreated: (() async -> Void)?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.yellow)

                    Text("Create Team Organization")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    Text("Team organizations let you collaborate with others on projects.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Organization Name")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        TextField("e.g. My Team", text: $name)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .overlay(
                                Rectangle()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                            .foregroundStyle(.white)
                            .autocorrectionDisabled()
                    }

                    if let error {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task {
                            await createOrganization()
                        }
                    } label: {
                        HStack {
                            if isCreating {
                                ProgressView()
                                    .tint(.black)
                            }
                            Text("Create Organization")
                        }
                        .font(.headline)
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? Color.yellow.opacity(0.3) : Color.yellow
                        )
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isCreating)

                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func createOrganization() async {
        isCreating = true
        error = nil

        do {
            let request = CreateOrganizationRequest(name: name.trimmingCharacters(in: .whitespacesAndNewlines))
            let _: Organization = try await APIClient.shared.post(
                Endpoints.organizations,
                body: request
            )
            await onCreated?()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }

        isCreating = false
    }
}

#Preview {
    CreateOrganizationSheet()
}
