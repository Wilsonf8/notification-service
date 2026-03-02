//
//  InCallVisitorInfoView.swift
//  LiveConnect
//
//  Created by Claude on 2/26/26.
//

import SwiftUI

/// Visitor info panel overlay during a video call.
/// Follows the same layout pattern as InCallChatView (right-side overlay, 300pt wide).
struct InCallVisitorInfoView: View {
    let projectId: UUID
    let visitorId: UUID
    let onClose: () -> Void

    @State private var visitor: CrmVisitorDetail?
    @State private var notes: [VisitorNote] = []
    @State private var isLoading = true
    @State private var newNoteText = ""
    @State private var isAddingNote = false
    @State private var dragOffset: CGFloat = 0

    // Contact field local state
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
    enum SaveStatus {
        case idle, saving, saved, error
    }

    /// Compact drag tab on the left edge for dismissing the panel.
    private var dragHandle: some View {
        Capsule()
            .fill(Color.white.opacity(0.35))
            .frame(width: 5, height: 44)
            .frame(width: 24, height: 80)
            .contentShape(Rectangle())
            .offset(x: -12)
            .highPriorityGesture(
                DragGesture(minimumDistance: 8)
                    .onChanged { value in
                        dragOffset = max(0, value.translation.width)
                    }
                    .onEnded { value in
                        if value.translation.width > 100 || value.predictedEndTranslation.width > 200 {
                            withAnimation { onClose() }
                        } else {
                            withAnimation(.spring(response: 0.3)) { dragOffset = 0 }
                        }
                    }
            )
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Visitor Info")
                    .font(.headline)
                    .foregroundStyle(.white)

                Spacer()

                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()

            if isLoading {
                loadingView
            } else if visitor != nil {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        contactSection
                        notesSection
                    }
                }
            } else {
                ContentUnavailableView("Visitor not found", systemImage: "person.slash")
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 300)
        .frame(maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .overlay(alignment: .leading) {
            dragHandle
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .offset(x: max(0, dragOffset))
        .task {
            await loadData()
        }
        .onChange(of: focusedField) { oldField, _ in
            guard let oldField else { return }

            let localValue: String
            let originalValue: String

            switch oldField{
                case .name:
                    localValue = nameValue
                    originalValue = visitor?.name ?? ""
                case .email:
                    localValue = emailValue
                    originalValue = visitor?.email ?? ""
                case .phone:
                    localValue = phoneValue
                    originalValue = visitor?.phone ?? ""
            }

            if localValue == originalValue{return}

            switch oldField{
                case .name: nameSaveStatus = .saving
                case .email: emailSaveStatus = .saving
                case .phone: phoneSaveStatus = .saving
            }

            Task{
                do{
                    try await saveContactField(oldField, value: localValue)
                    switch oldField{
                        case .name: nameSaveStatus = .saved
                        case .email: emailSaveStatus = .saved
                        case .phone: phoneSaveStatus = .saved
                    }

                    try? await Task.sleep(for: .seconds(2))
                    switch oldField{
                        case .name: nameSaveStatus = .idle
                        case .email: emailSaveStatus = .idle
                        case .phone: phoneSaveStatus = .idle
                    }

                } catch{
                    switch oldField{
                        case .name: nameSaveStatus = .error
                        case .email: emailSaveStatus = .error
                        case .phone: phoneSaveStatus = .error
                    }
                }
            }

        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            DotWaveLoader(.regular)
            Text("Loading visitor info...")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Contact Section

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CONTACT")
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .tracking(1)

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
        }
        .padding()
    }

    /// Renders a single contact field row with icon and save status.
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
            DotWaveLoader(.compact)
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

    // MARK: - Notes Section

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Divider()
                .background(Color.white.opacity(0.2))

            Text("NOTES")
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .tracking(1)
                .padding(.horizontal)

            // Add note input
            HStack(spacing: 8) {
                TextField("Add a note...", text: $newNoteText, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .lineLimit(1...4)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.1))

                Button {
                    Task { await addNote() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.yellow)
                }
                .disabled(newNoteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isAddingNote)
            }
            .padding(.horizontal)

            // Notes list
            if notes.isEmpty {
                Text("No notes yet.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else {
                ForEach(notes) { note in
                    noteRow(note)
                }
            }
        }
        .padding(.vertical)
    }

    /// Renders a single note with content, author, and delete button.
    private func noteRow(_ note: VisitorNote) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                Text(note.content)
                    .font(.subheadline)
                    .foregroundStyle(.white)

                Spacer()

                Button {
                    Task { await deleteNote(note.id) }
                } label: {
                    Image(systemName: "trash")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Text("\(note.authorName) · \(note.createdAt.formatted(.dateTime.month(.abbreviated).day().hour().minute()))")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.05))
    }

    // MARK: - Data Loading

    /// Fetches visitor detail and notes in parallel.
    private func loadData() async {
        isLoading = true
        do {
            async let visitorTask: CrmVisitorDetail = APIClient.shared.get(
                Endpoints.crmVisitorDetail(projectId: projectId, visitorId: visitorId)
            )
            async let notesTask: VisitorNotesResponse = APIClient.shared.get(
                Endpoints.crmVisitorNotes(projectId: projectId, visitorId: visitorId)
            )

            let (fetchedVisitor, fetchedNotes) = try await (visitorTask, notesTask)
            self.visitor = fetchedVisitor
            self.notes = fetchedNotes.content
            self.nameValue = fetchedVisitor.name ?? ""
            self.emailValue = fetchedVisitor.email ?? ""
            self.phoneValue = fetchedVisitor.phone ?? ""
        } catch {
            print("InCallVisitorInfoView: Failed to load data: \(error)")
        }
        isLoading = false
    }

    // MARK: - Contact Save

    /// Sends a PATCH to update a single contact field.
    /// - Parameters:
    ///   - field: Which contact field changed.
    ///   - value: The new value.
    private func saveContactField(_ field: ContactField, value: String) async throws {
        let request: UpdateVisitorContactRequest
        switch field {
        case .name:
            request = UpdateVisitorContactRequest(name: value, email: nil, phone: nil)
        case .email:
            request = UpdateVisitorContactRequest(name: nil, email: value, phone: nil)
        case .phone:
            request = UpdateVisitorContactRequest(name: nil, email: nil, phone: value)
        }
        try await APIClient.shared.patch(
            Endpoints.crmUpdateVisitorContact(projectId: projectId, visitorId: visitorId),
            body: request
        )
    }

    // MARK: - Notes CRUD

    /// Adds a new note.
    /// Uses the void POST overload then re-fetches the notes list,
    /// because the POST response date format can differ from the GET format
    /// and may fail to decode.
    @MainActor
    private func addNote() async {
        let content = newNoteText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }

        isAddingNote = true
        do {
            try await APIClient.shared.post(
                Endpoints.crmVisitorNotes(projectId: projectId, visitorId: visitorId),
                body: AddNoteRequest(content: content)
            )
            let response: VisitorNotesResponse = try await APIClient.shared.get(
                Endpoints.crmVisitorNotes(projectId: projectId, visitorId: visitorId)
            )
            withAnimation {
                notes = response.content
            }
            newNoteText = ""
        } catch {
            print("InCallVisitorInfoView: Failed to add note: \(error)")
        }
        isAddingNote = false
    }

    /// Deletes a note by ID.
    @MainActor
    private func deleteNote(_ noteId: UUID) async {
        do {
            try await APIClient.shared.delete(
                Endpoints.crmVisitorNote(projectId: projectId, visitorId: visitorId, noteId: noteId)
            )
            withAnimation {
                notes.removeAll { $0.id == noteId }
            }
        } catch {
            print("InCallVisitorInfoView: Failed to delete note: \(error)")
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        InCallVisitorInfoView(
            projectId: UUID(),
            visitorId: UUID(),
            onClose: {}
        )
    }
}
