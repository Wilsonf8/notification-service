//
//  CrmVisitorListView.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import SwiftUI

/// List view for CRM visitors with search, time filter, and infinite scroll.
struct CrmVisitorListView: View {
    /// The project UUID.
    let projectId: UUID

    /// Available reps (passed from dashboard for use in detail views).
    let reps: [Rep]

    @State private var viewModel: CrmVisitorListViewModel
    @State private var navigationPath = NavigationPath()

    init(projectId: UUID, reps: [Rep]) {
        self.projectId = projectId
        self.reps = reps
        self._viewModel = State(initialValue: CrmVisitorListViewModel(projectId: projectId))
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search visitors...", text: $viewModel.searchText)
                        .foregroundStyle(.white)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                .padding(10)
                .background(Color.white.opacity(0.08))
                .padding(.horizontal)
                .padding(.top, 8)

                // Time filter
                CrmTimeFilter(selectedDays: $viewModel.selectedDays)
                    .padding(.horizontal)
                    .padding(.top, 8)

                // Stage filter
                CrmStageFilter(selectedStages: $viewModel.selectedStages)
                    .padding(.horizontal)
                    .padding(.top, 8)

                // Tag filter (only show if tags exist)
                if !viewModel.projectTags.isEmpty {
                    CrmTagFilter(
                        tags: viewModel.projectTags,
                        selectedTagIds: $viewModel.selectedTagIds
                    )
                    .padding(.horizontal)
                    .padding(.top, 8)
                }

                // Sort picker
                CrmSortPicker(
                    sortField: $viewModel.sortField,
                    ascending: $viewModel.sortAscending
                )
                .padding(.horizontal)
                .padding(.top, 8)

                // Boolean filters
                CrmBooleanFilters(
                    hasBeenInCall: $viewModel.hasBeenInCall,
                    hasContactForm: $viewModel.hasContactForm,
                    hasContactInfo: $viewModel.hasContactInfo,
                    repUpdatedInfo: $viewModel.repUpdatedInfo,
                    onlineNow: $viewModel.onlineNow
                )
                .padding(.horizontal)
                .padding(.top, 8)

                // Content
                ZStack {
                    if viewModel.isLoading && viewModel.visitors.isEmpty {
                        ProgressView()
                            .tint(.white)
                    } else if let error = viewModel.error, viewModel.visitors.isEmpty {
                        errorView(error)
                    } else if viewModel.visitors.isEmpty {
                        emptyState
                    } else {
                        visitorList
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .task {
                await viewModel.loadVisitors()
                await viewModel.loadProjectTags()
            }
            .navigationDestination(for: UUID.self) { visitorId in
                CrmVisitorDetailView(
                    projectId: projectId,
                    visitorId: visitorId,
                    reps: reps
                )
            }
        }
    }

    // MARK: - Subviews

    private var visitorList: some View {
        ScrollView {
            LazyVStack(spacing: 1) {
                ForEach(viewModel.visitors) { visitor in
                    CrmVisitorRow(visitor: visitor) {
                        navigationPath.append(visitor.id)
                    }
                    .onAppear {
                        if visitor.id == viewModel.visitors.last?.id && viewModel.hasMore {
                            Task {
                                await viewModel.loadMore()
                            }
                        }
                    }
                }

                if viewModel.isLoadingMore {
                    ProgressView()
                        .tint(.white)
                        .padding()
                }
            }
            .padding(.vertical, 8)
        }
        .refreshable {
            await viewModel.reload()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.text.rectangle")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No visitors found")
                .font(.headline)
                .foregroundStyle(.white)

            Text("Visitors will appear here as they browse your site")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.yellow)

            Text("Failed to load visitors")
                .font(.headline)
                .foregroundStyle(.white)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task {
                    await viewModel.loadVisitors()
                }
            }
            .buttonStyle(.bordered)
            .tint(.yellow)
        }
        .padding()
    }
}

// MARK: - CrmVisitorRow

/// A single row in the CRM visitor list.
private struct CrmVisitorRow: View {
    let visitor: CrmVisitorListItem
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Avatar initial
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(visitor.displayName.prefix(1).uppercased())
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                    )

                // Info
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(visitor.displayName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.white)
                            .lineLimit(1)

                        Spacer()

                        LeadScoreBadge(score: visitor.leadScore)
                    }

                    if let email = visitor.email, !email.isEmpty, visitor.name != nil {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    HStack {
                        if let location = visitor.locationString {
                            Text(location)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }

                        Spacer()

                        // Pipeline badge
                        Text(visitor.pipelineStage.label.uppercased())
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(pipelineColor(visitor.pipelineStage))

                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    // Tags
                    if !visitor.tags.isEmpty {
                        HStack(spacing: 4) {
                            ForEach(visitor.tags.prefix(3)) { tag in
                                Text(tag.name)
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(hex: tag.color) ?? Color.white.opacity(0.15))
                            }
                            if visitor.tags.count > 3 {
                                Text("+\(visitor.tags.count - 3)")
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
            .background(Color.white.opacity(0.05))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// Returns a color for the pipeline stage badge.
    /// - Parameter stage: The pipeline stage.
    /// - Returns: The badge color.
    private func pipelineColor(_ stage: PipelineStage) -> Color {
        switch stage {
        case .new: return .yellow
        case .engaged: return .orange
        case .won: return .green
        }
    }
}

// MARK: - Color Hex Extension

extension Color {
    /// Creates a Color from a hex string (e.g., "#FF5733" or "FF5733").
    /// - Parameter hex: The hex color string.
    init?(hex: String) {
        let cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
        guard cleaned.count == 6 else { return nil }
        var rgbValue: UInt64 = 0
        guard Scanner(string: cleaned).scanHexInt64(&rgbValue) else { return nil }
        self.init(
            red: Double((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: Double((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgbValue & 0x0000FF) / 255.0
        )
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        CrmVisitorListView(projectId: UUID(), reps: [])
    }
}
