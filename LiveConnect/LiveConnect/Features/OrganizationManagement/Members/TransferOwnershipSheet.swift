//
//  TransferOwnershipSheet.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// Sheet for transferring organization ownership to another member.
struct TransferOwnershipSheet: View {
    @Environment(\.dismiss) private var dismiss
    let members: [OrganizationMember]
    let organizationName: String
    @State private var selectedMemberId: UUID?
    @State private var confirmationText = ""
    let onTransfer: (UUID) -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        Image(systemName: "arrow.right.arrow.left.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(.yellow)

                        Text("Transfer Ownership")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)

                        Text("You will be demoted to Admin after transferring ownership. This action cannot be easily undone.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)

                        // Member selector
                        VStack(alignment: .leading, spacing: 8) {
                            Text("SELECT NEW OWNER")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.secondary)

                            VStack(spacing: 1) {
                                ForEach(members) { member in
                                    Button {
                                        selectedMemberId = member.id
                                    } label: {
                                        HStack(spacing: 12) {
                                            Circle()
                                                .fill(Color.yellow.opacity(0.3))
                                                .frame(width: 36, height: 36)
                                                .overlay(
                                                    Text(member.displayName.prefix(1).uppercased())
                                                        .font(.caption)
                                                        .fontWeight(.bold)
                                                        .foregroundStyle(.yellow)
                                                )

                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(member.displayName)
                                                    .font(.subheadline)
                                                    .foregroundStyle(.white)
                                                Text("@\(member.username)")
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }

                                            Spacer()

                                            if selectedMemberId == member.id {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundStyle(.yellow)
                                            }
                                        }
                                        .padding()
                                        .background(
                                            selectedMemberId == member.id
                                            ? Color.yellow.opacity(0.1) : Color.clear
                                        )
                                    }
                                }
                            }
                            .background(Color.white.opacity(0.05))
                        }

                        // Confirmation
                        if selectedMemberId != nil {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Type **transfer** to confirm:")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)

                                TextField("transfer", text: $confirmationText)
                                    .textFieldStyle(.plain)
                                    .padding()
                                    .background(Color.white.opacity(0.05))
                                    .overlay(
                                        Rectangle()
                                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                    )
                                    .autocorrectionDisabled()
                                    .textInputAutocapitalization(.never)
                            }
                        }

                        // Transfer button
                        Button {
                            if let memberId = selectedMemberId {
                                onTransfer(memberId)
                                dismiss()
                            }
                        } label: {
                            Text("Transfer Ownership")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(canTransfer ? Color.red : Color.red.opacity(0.3))
                        }
                        .disabled(!canTransfer)
                    }
                    .padding()
                }
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

    private var canTransfer: Bool {
        selectedMemberId != nil && confirmationText.lowercased() == "transfer"
    }
}
