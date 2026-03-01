//
//  CrmVisitorDetailViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import Foundation

/// View model for the CRM visitor detail screen.
@MainActor
@Observable
final class CrmVisitorDetailViewModel {
    /// The visitor detail.
    private(set) var detail: CrmVisitorDetail?

    /// Whether the detail is loading.
    private(set) var isLoadingDetail = false

    /// Error from loading the detail.
    private(set) var detailError: Error?

    /// Notes for this visitor.
    private(set) var notes: [VisitorNote] = []

    /// Whether notes are loading.
    private(set) var isLoadingNotes = false

    /// Current notes page.
    private var notesPage = 0

    /// Whether there are more notes pages.
    private(set) var hasMoreNotes = true

    /// Timeline events for this visitor.
    private(set) var timeline: [TimelineEvent] = []

    /// Whether timeline is loading.
    private(set) var isLoadingTimeline = false

    /// Current timeline page.
    private var timelinePage = 0

    /// Whether there are more timeline pages.
    private(set) var hasMoreTimeline = true

    /// Conversations for this visitor.
    private(set) var conversations: [Conversation] = []

    /// Whether conversations are loading.
    private(set) var isLoadingConversations = false

    /// Current conversations page.
    private var conversationsPage = 0

    /// Whether there are more conversations pages.
    private(set) var hasMoreConversations = true

    /// All project tags (for the tag picker).
    private(set) var projectTags: [CrmTag] = []

    /// Whether a stage update is in progress (tracks which stage is loading).
    private(set) var updatingStage: PipelineStage?

    /// Whether a rep assignment is in progress.
    private(set) var isAssigningRep = false

    /// Whether a tag operation is in progress.
    private(set) var isUpdatingTags = false

    /// Whether a note is being submitted.
    private(set) var isSubmittingNote = false

    /// The project UUID.
    private let projectId: UUID

    /// The visitor UUID.
    private let visitorId: UUID

    /// Page size for paginated requests.
    private let pageSize = 20

    /// Creates a new CRM visitor detail view model.
    /// - Parameters:
    ///   - projectId: The project UUID.
    ///   - visitorId: The visitor UUID.
    init(projectId: UUID, visitorId: UUID) {
        self.projectId = projectId
        self.visitorId = visitorId
    }

    // MARK: - Loading

    /// Loads the visitor detail and initial data.
    func loadDetail() async {
        isLoadingDetail = true
        detailError = nil

        do {
            async let detailTask: CrmVisitorDetail = APIClient.shared.get(
                Endpoints.crmVisitorDetail(projectId: projectId, visitorId: visitorId)
            )
            async let tagsTask: [CrmTag] = APIClient.shared.get(
                Endpoints.crmTags(projectId: projectId)
            )

            let (detail, tags) = try await (detailTask, tagsTask)
            self.detail = detail
            self.projectTags = tags
        } catch {
            self.detailError = error
        }

        isLoadingDetail = false
    }

    /// Loads notes (first page or next page).
    /// - Parameter reset: Whether to reset to the first page.
    func loadNotes(reset: Bool = false) async {
        guard !isLoadingNotes else { return }
        if reset {
            notesPage = 0
            hasMoreNotes = true
        }
        guard hasMoreNotes else { return }

        isLoadingNotes = true

        do {
            let response: VisitorNotesResponse = try await APIClient.shared.get(
                Endpoints.crmVisitorNotes(projectId: projectId, visitorId: visitorId),
                queryItems: [
                    URLQueryItem(name: "page", value: String(notesPage)),
                    URLQueryItem(name: "size", value: String(pageSize))
                ]
            )
            if reset {
                notes = response.content
            } else {
                notes.append(contentsOf: response.content)
            }
            hasMoreNotes = notesPage < response.totalPages - 1
            notesPage += 1
        } catch {
            print("CrmVisitorDetailVM: Failed to load notes: \(error)")
        }

        isLoadingNotes = false
    }

    /// Loads timeline events (first page or next page).
    /// - Parameter reset: Whether to reset to the first page.
    func loadTimeline(reset: Bool = false) async {
        guard !isLoadingTimeline else { return }
        if reset {
            timelinePage = 0
            hasMoreTimeline = true
        }
        guard hasMoreTimeline else { return }

        isLoadingTimeline = true

        do {
            let response: TimelineResponse = try await APIClient.shared.get(
                Endpoints.crmVisitorTimeline(projectId: projectId, visitorId: visitorId),
                queryItems: [
                    URLQueryItem(name: "page", value: String(timelinePage)),
                    URLQueryItem(name: "size", value: String(pageSize))
                ]
            )
            if reset {
                timeline = response.events
            } else {
                timeline.append(contentsOf: response.events)
            }
            hasMoreTimeline = timelinePage < response.totalPages - 1
            timelinePage += 1
        } catch {
            print("CrmVisitorDetailVM: Failed to load timeline: \(error)")
        }

        isLoadingTimeline = false
    }

    /// Loads conversations (first page or next page).
    /// - Parameter reset: Whether to reset to the first page.
    func loadConversations(reset: Bool = false) async {
        guard !isLoadingConversations else { return }
        if reset {
            conversationsPage = 0
            hasMoreConversations = true
        }
        guard hasMoreConversations else { return }

        isLoadingConversations = true

        do {
            let response: CrmConversationsResponse = try await APIClient.shared.get(
                Endpoints.crmVisitorConversations(projectId: projectId, visitorId: visitorId),
                queryItems: [
                    URLQueryItem(name: "page", value: String(conversationsPage)),
                    URLQueryItem(name: "size", value: String(pageSize))
                ]
            )
            if reset {
                conversations = response.conversations
            } else {
                conversations.append(contentsOf: response.conversations)
            }
            hasMoreConversations = conversationsPage < response.totalPages - 1
            conversationsPage += 1
        } catch {
            print("CrmVisitorDetailVM: Failed to load conversations: \(error)")
        }

        isLoadingConversations = false
    }

    // MARK: - Mutations

    /// Updates the visitor's contact information.
    /// Only non-nil fields are sent; the backend ignores null fields.
    /// - Parameters:
    ///   - name: The new name, or nil to leave unchanged.
    ///   - email: The new email, or nil to leave unchanged.
    ///   - phone: The new phone, or nil to leave unchanged.
    func updateContact(name: String?, email: String?, phone: String?) async throws {
        let request = UpdateVisitorContactRequest(name: name, email: email, phone: phone)
        try await APIClient.shared.patch(
            Endpoints.crmUpdateVisitorContact(projectId: projectId, visitorId: visitorId),
            body: request
        )
        if let name { detail?.name = name }
        if let email { detail?.email = email }
        if let phone { detail?.phone = phone }
    }

    /// Updates the visitor's pipeline stage.
    /// - Parameter stage: The new stage.
    func updateStage(_ stage: PipelineStage) async {
        updatingStage = stage
        do {
            try await APIClient.shared.put(
                Endpoints.crmUpdateStage(projectId: projectId, visitorId: visitorId),
                body: UpdateStageRequest(stage: stage.rawValue)
            )
            detail?.pipelineStage = stage
        } catch {
            print("CrmVisitorDetailVM: Failed to update stage: \(error)")
        }
        updatingStage = nil
    }

    /// Assigns a rep to the visitor.
    /// - Parameter rep: The rep to assign.
    func assignRep(_ rep: Rep) async {
        isAssigningRep = true
        do {
            try await APIClient.shared.put(
                Endpoints.crmAssignRep(projectId: projectId, visitorId: visitorId),
                body: AssignRepRequest(repId: rep.id)
            )
            detail?.assignedRep = rep
        } catch {
            print("CrmVisitorDetailVM: Failed to assign rep: \(error)")
        }
        isAssigningRep = false
    }

    /// Unassigns the current rep from the visitor.
    func unassignRep() async {
        isAssigningRep = true
        do {
            try await APIClient.shared.delete(
                Endpoints.crmAssignRep(projectId: projectId, visitorId: visitorId)
            )
            detail?.assignedRep = nil
        } catch {
            print("CrmVisitorDetailVM: Failed to unassign rep: \(error)")
        }
        isAssigningRep = false
    }

    /// Adds a tag to the visitor.
    /// - Parameter tagId: The tag UUID to add.
    func addTag(_ tagId: UUID) async {
        isUpdatingTags = true
        do {
            try await APIClient.shared.post(
                Endpoints.crmVisitorTags(projectId: projectId, visitorId: visitorId),
                body: AddTagRequest(tagId: tagId)
            )
            if let tag = projectTags.first(where: { $0.id == tagId }) {
                detail?.tags.append(tag)
            }
        } catch {
            print("CrmVisitorDetailVM: Failed to add tag: \(error)")
        }
        isUpdatingTags = false
    }

    /// Removes a tag from the visitor.
    /// - Parameter tagId: The tag UUID to remove.
    func removeTag(_ tagId: UUID) async {
        isUpdatingTags = true
        do {
            try await APIClient.shared.delete(
                Endpoints.crmVisitorTag(projectId: projectId, visitorId: visitorId, tagId: tagId)
            )
            detail?.tags.removeAll { $0.id == tagId }
        } catch {
            print("CrmVisitorDetailVM: Failed to remove tag: \(error)")
        }
        isUpdatingTags = false
    }

    /// Adds a note to the visitor.
    /// - Parameter content: The note content.
    func addNote(_ content: String) async {
        isSubmittingNote = true
        do {
            let note: VisitorNote = try await APIClient.shared.post(
                Endpoints.crmVisitorNotes(projectId: projectId, visitorId: visitorId),
                body: AddNoteRequest(content: content)
            )
            notes.insert(note, at: 0)
        } catch {
            print("CrmVisitorDetailVM: Failed to add note: \(error)")
        }
        isSubmittingNote = false
    }

    /// Deletes a note.
    /// - Parameter noteId: The note UUID to delete.
    func deleteNote(_ noteId: UUID) async {
        do {
            try await APIClient.shared.delete(
                Endpoints.crmVisitorNote(projectId: projectId, visitorId: visitorId, noteId: noteId)
            )
            notes.removeAll { $0.id == noteId }
        } catch {
            print("CrmVisitorDetailVM: Failed to delete note: \(error)")
        }
    }
}
