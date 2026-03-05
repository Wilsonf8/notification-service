//
//  ChangeRoleSheet.swift
//  LiveConnect
//
//  Created by Claude on 3/5/26.
//

import SwiftUI

/// Sheet for changing a member's role in the organization.
struct ChangeRoleSheet: View {
    @Environment(\.dismiss) private var dismiss
    let member: OrganizationMember
    let organizationSlug: String
    @State private var selectedRole: OrganizationRole
    let onSave: (OrganizationRole) -> Void

    /// Initializes the sheet with a member and save callback.
    /// - Parameters:
    ///   - member: The member whose role to change.
    ///   - organizationSlug: The organization slug.
    ///   - onSave: Callback with the new role when saved.
    init(member: OrganizationMember, organizationSlug: String, onSave: @escaping (OrganizationRole) -> Void) {
        self.member = member
        self.organizationSlug = organizationSlug
        self._selectedRole = State(initialValue: member.role)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    // Member info
                    VStack(spacing: 8) {
                        memberAvatar

                        Text(member.displayName)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)

                        Text("@\(member.username)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 32)

                    // Role picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("ROLE")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)

                        Picker("Role", selection: $selectedRole) {
                            Text("Admin").tag(OrganizationRole.admin)
                            Text("Member").tag(OrganizationRole.member)
                        }
                        .pickerStyle(.segmented)
                    }

                    // Role descriptions
                    VStack(alignment: .leading, spacing: 8) {
                        roleDescription(role: .admin, description: "Can manage members, invitations, and projects")
                        roleDescription(role: .member, description: "Can view organization and projects")
                    }

                    Button {
                        onSave(selectedRole)
                        dismiss()
                    } label: {
                        Text("Save")
                            .font(.headline)
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(selectedRole != member.role ? Color.yellow : Color.yellow.opacity(0.3))
                    }
                    .disabled(selectedRole == member.role)

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
        .presentationDetents([.medium])
    }

    private var memberAvatar: some View {
        Group {
            if let avatarUrl = member.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 60, height: 60)
                            .clipShape(Circle())
                    default:
                        avatarPlaceholder
                    }
                }
            } else {
                avatarPlaceholder
            }
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Color.yellow.opacity(0.3))
            .frame(width: 60, height: 60)
            .overlay(
                Text(member.displayName.prefix(1).uppercased())
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.yellow)
            )
    }

    private func roleDescription(role: OrganizationRole, description: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: selectedRole == role ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(selectedRole == role ? .yellow : .secondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(role.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
