//
//  CrmVisitorDetailView.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// Detail view for a CRM visitor with collapsible sections.
struct CrmVisitorDetailView: View {
    /// The project UUID.
    let projectId: UUID

    /// The visitor UUID.
    let visitorId: UUID

    /// Available reps for assignment.
    let reps: [Rep]

    @State private var viewModel: CrmVisitorDetailViewModel

    // Section expansion states (all expanded by default)
    @State private var isContactInfoExpanded = true
    @State private var isEngagementExpanded = true
    @State private var isPipelineExpanded = true
    @State private var isTagsExpanded = true
    @State private var isNotesExpanded = true
    @State private var isTimelineExpanded = true
    @State private var isConversationsExpanded = true

    /// The current rep, matched by userId.
    private var currentRepId: UUID? {
        guard let userId = AuthManager.shared.currentUser?.id else { return nil }
        return reps.first { $0.userId == userId }?.id
    }

    init(projectId: UUID, visitorId: UUID, reps: [Rep]) {
        self.projectId = projectId
        self.visitorId = visitorId
        self.reps = reps
        self._viewModel = State(initialValue: CrmVisitorDetailViewModel(projectId: projectId, visitorId: visitorId))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if viewModel.isLoadingDetail && viewModel.detail == nil {
                ProgressView()
                    .tint(.white)
            } else if let error = viewModel.detailError, viewModel.detail == nil {
                errorView(error)
            } else if let detail = viewModel.detail {
                detailContent(detail)
            }
        }
        .navigationTitle("Visitor Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task {
            await viewModel.loadDetail()
            // Load initial data for sections in parallel
            async let notesLoad: () = viewModel.loadNotes(reset: true)
            async let timelineLoad: () = viewModel.loadTimeline(reset: true)
            async let conversationsLoad: () = viewModel.loadConversations(reset: true)
            _ = await (notesLoad, timelineLoad, conversationsLoad)
        }
    }

    // MARK: - Detail Content

    @ViewBuilder
    private func detailContent(_ detail: CrmVisitorDetail) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection(detail)

                // Collapsible sections
                sectionGroup("CONTACT INFO", isExpanded: $isContactInfoExpanded) {
                    CrmContactInfoSection(
                        detail: detail,
                        onSave: { name, email, phone in
                            try await viewModel.updateContact(name: name, email: email, phone: phone)
                        }
                    )
                }

                sectionGroup("ENGAGEMENT", isExpanded: $isEngagementExpanded) {
                    CrmEngagementStats(
                        visitStats: detail.visitStats,
                        engagementStats: detail.engagementStats
                    )
                }

                sectionGroup("PIPELINE & ASSIGNMENT", isExpanded: $isPipelineExpanded) {
                    pipelineSection(detail)
                }

                sectionGroup("TAGS", isExpanded: $isTagsExpanded) {
                    CrmTagsSection(
                        tags: detail.tags,
                        projectTags: viewModel.projectTags,
                        isUpdating: viewModel.isUpdatingTags,
                        onAdd: { tagId in Task { await viewModel.addTag(tagId) } },
                        onRemove: { tagId in Task { await viewModel.removeTag(tagId) } }
                    )
                }

                sectionGroup("NOTES", isExpanded: $isNotesExpanded) {
                    CrmNotesSection(
                        notes: viewModel.notes,
                        isSubmitting: viewModel.isSubmittingNote,
                        isLoading: viewModel.isLoadingNotes,
                        hasMore: viewModel.hasMoreNotes,
                        currentRepId: currentRepId,
                        onAdd: { content in Task { await viewModel.addNote(content) } },
                        onDelete: { noteId in Task { await viewModel.deleteNote(noteId) } },
                        onLoadMore: { Task { await viewModel.loadNotes() } }
                    )
                }

                sectionGroup("TIMELINE", isExpanded: $isTimelineExpanded) {
                    CrmTimelineSection(
                        events: viewModel.timeline,
                        isLoading: viewModel.isLoadingTimeline,
                        hasMore: viewModel.hasMoreTimeline,
                        onLoadMore: { Task { await viewModel.loadTimeline() } }
                    )
                }

                sectionGroup("CONVERSATIONS", isExpanded: $isConversationsExpanded) {
                    CrmConversationsSection(
                        projectId: projectId,
                        conversations: viewModel.conversations,
                        isLoading: viewModel.isLoadingConversations,
                        hasMore: viewModel.hasMoreConversations,
                        onLoadMore: { Task { await viewModel.loadConversations() } }
                    )
                }
            }
            .padding()
        }
    }

    // MARK: - Header

    private func headerSection(_ detail: CrmVisitorDetail) -> some View {
        VStack(spacing: 8) {
            // Avatar
            Circle()
                .fill(Color.white.opacity(0.1))
                .frame(width: 72, height: 72)
                .overlay(
                    Text(detail.displayName.prefix(1).uppercased())
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                )

            // Name
            Text(detail.displayName)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(.white)

            // Email
            if let email = detail.email {
                Text(email)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Lead score
            LeadScoreBadge(score: detail.leadScore)
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 8)
    }

    // MARK: - Pipeline Section

    private func pipelineSection(_ detail: CrmVisitorDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Stage selector
            Text("Stage")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)

            PipelineStageSelector(
                currentStage: detail.pipelineStage,
                updatingStage: viewModel.updatingStage,
                onSelect: { stage in Task { await viewModel.updateStage(stage) } }
            )

            // Rep assignment
            Text("Assigned Rep")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
                .padding(.top, 4)

            if viewModel.isAssigningRep {
                ProgressView()
                    .tint(.white)
                    .controlSize(.small)
            } else {
                Menu {
                    if detail.assignedRep != nil {
                        Button("Unassign", role: .destructive) {
                            Task { await viewModel.unassignRep() }
                        }
                    }
                    ForEach(reps) { rep in
                        Button(rep.name) {
                            Task { await viewModel.assignRep(rep) }
                        }
                    }
                } label: {
                    HStack {
                        Text(detail.assignedRep?.name ?? "Select rep...")
                            .font(.subheadline)
                            .foregroundStyle(detail.assignedRep != nil ? .white : .secondary)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(10)
                    .background(Color.white.opacity(0.08))
                }
            }
        }
    }

    // MARK: - Section Group

    /// A collapsible section with a header.
    @ViewBuilder
    private func sectionGroup<Content: View>(
        _ title: String,
        isExpanded: Binding<Bool>,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.wrappedValue.toggle()
                }
            } label: {
                HStack {
                    Image(systemName: isExpanded.wrappedValue ? "chevron.down" : "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(width: 16)

                    Text(title)
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundStyle(.secondary)

                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 1)
                }
            }
            .buttonStyle(.plain)

            if isExpanded.wrappedValue {
                content()
                    .padding(.top, 12)
                    .padding(.leading, 16)
            }
        }
    }

    // MARK: - Error View

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.yellow)

            Text("Failed to load visitor")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task { await viewModel.loadDetail() }
            }
            .buttonStyle(.bordered)
            .tint(.yellow)
        }
        .padding()
    }
}

#Preview {
    NavigationStack {
        CrmVisitorDetailView(
            projectId: UUID(),
            visitorId: UUID(),
            reps: []
        )
    }
}
