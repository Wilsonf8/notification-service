//
//  CrmVisitorListViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/23/26.
//

import Foundation

/// View model for the CRM visitor list.
@MainActor
@Observable
final class CrmVisitorListViewModel {
    /// The list of CRM visitors.
    private(set) var visitors: [CrmVisitorListItem] = []

    /// Whether the initial load is in progress.
    private(set) var isLoading = false

    /// Whether a page load is in progress.
    private(set) var isLoadingMore = false

    /// The last error that occurred.
    private(set) var error: Error?

    /// Current page for pagination (0-indexed).
    private var currentPage = 0

    /// Whether there are more pages to load.
    private(set) var hasMore = true

    /// Search text filter.
    var searchText = "" {
        didSet {
            searchDebounceTask?.cancel()
            searchDebounceTask = Task {
                try? await Task.sleep(for: .milliseconds(300))
                guard !Task.isCancelled else { return }
                await reload()
            }
        }
    }

    /// Selected time filter in days.
    var selectedDays = 7 {
        didSet {
            Task { await reload() }
        }
    }

    /// Selected pipeline stages to filter by (empty = all).
    var selectedStages: Set<PipelineStage> = [] {
        didSet {
            Task { await reload() }
        }
    }

    /// Selected tag IDs to filter by with AND logic (empty = all).
    var selectedTagIds: Set<UUID> = [] {
        didSet {
            Task { await reload() }
        }
    }

    /// Sort field for the visitor list.
    var sortField: CrmSortField = .lastSeenAt {
        didSet { Task { await reload() } }
    }

    /// Whether sort direction is ascending.
    var sortAscending = false {
        didSet { Task { await reload() } }
    }

    /// Filter: visitors who have been in a call.
    var hasBeenInCall = false {
        didSet { Task { await reload() } }
    }

    /// Filter: visitors who submitted a contact form.
    var hasContactForm = false {
        didSet { Task { await reload() } }
    }

    /// Filter: visitors who have contact info.
    var hasContactInfo = false {
        didSet { Task { await reload() } }
    }

    /// Filter: visitors with rep-updated info.
    var repUpdatedInfo = false {
        didSet { Task { await reload() } }
    }

    /// Filter: visitors currently online.
    var onlineNow = false {
        didSet { Task { await reload() } }
    }

    /// Available project tags for the filter UI.
    private(set) var projectTags: [CrmTag] = []

    /// Page size for API requests.
    private let pageSize = 20

    /// The project UUID.
    private let projectId: UUID

    /// Debounce task for search.
    private var searchDebounceTask: Task<Void, Never>?

    /// Creates a new CRM visitor list view model.
    /// - Parameter projectId: The project UUID.
    init(projectId: UUID) {
        self.projectId = projectId
    }

    // MARK: - Public Methods

    /// Loads the first page of visitors.
    func loadVisitors() async {
        isLoading = true
        error = nil
        currentPage = 0

        do {
            let response: CrmVisitorListResponse = try await APIClient.shared.get(
                Endpoints.crmVisitors(projectId: projectId),
                queryItems: buildQueryItems(page: 0)
            )
            visitors = response.visitors
            hasMore = response.visitors.count == pageSize
        } catch {
            self.error = error
        }

        isLoading = false
    }

    /// Loads the next page of visitors.
    func loadMore() async {
        guard !isLoading && !isLoadingMore && hasMore else { return }

        isLoadingMore = true
        currentPage += 1

        do {
            let response: CrmVisitorListResponse = try await APIClient.shared.get(
                Endpoints.crmVisitors(projectId: projectId),
                queryItems: buildQueryItems(page: currentPage)
            )
            visitors.append(contentsOf: response.visitors)
            hasMore = response.visitors.count == pageSize
        } catch {
            currentPage -= 1
        }

        isLoadingMore = false
    }

    /// Reloads from page 0 (used for pull-to-refresh and filter changes).
    func reload() async {
        await loadVisitors()
    }

    /// Loads available project tags for the filter UI.
    func loadProjectTags() async {
        do {
            projectTags = try await APIClient.shared.get(
                Endpoints.crmTags(projectId: projectId)
            )
        } catch {}
    }

    // MARK: - Private Methods

    /// Builds query items for the API request.
    /// - Parameter page: The page number.
    /// - Returns: Array of URLQueryItem.
    private func buildQueryItems(page: Int) -> [URLQueryItem] {
        var items = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "size", value: String(pageSize)),
            URLQueryItem(name: "days", value: String(selectedDays)),
            URLQueryItem(name: "sort", value: sortField.rawValue),
            URLQueryItem(name: "direction", value: sortAscending ? "asc" : "desc")
        ]
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            items.append(URLQueryItem(name: "search", value: trimmed))
        }
        if !selectedStages.isEmpty {
            items.append(URLQueryItem(name: "stages", value: selectedStages.map(\.rawValue).joined(separator: ",")))
        }
        if !selectedTagIds.isEmpty {
            items.append(URLQueryItem(name: "tagIds", value: selectedTagIds.map(\.uuidString).joined(separator: ",")))
        }
        if hasBeenInCall {
            items.append(URLQueryItem(name: "hasBeenInCall", value: "true"))
        }
        if hasContactForm {
            items.append(URLQueryItem(name: "hasContactForm", value: "true"))
        }
        if hasContactInfo {
            items.append(URLQueryItem(name: "hasContactInfo", value: "true"))
        }
        if repUpdatedInfo {
            items.append(URLQueryItem(name: "repUpdatedInfo", value: "true"))
        }
        if onlineNow {
            items.append(URLQueryItem(name: "onlineNow", value: "true"))
        }
        return items
    }
}
