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

    // MARK: - Private Methods

    /// Builds query items for the API request.
    /// - Parameter page: The page number.
    /// - Returns: Array of URLQueryItem.
    private func buildQueryItems(page: Int) -> [URLQueryItem] {
        var items = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "size", value: String(pageSize)),
            URLQueryItem(name: "days", value: String(selectedDays)),
            URLQueryItem(name: "sort", value: "lastSeenAt"),
            URLQueryItem(name: "direction", value: "desc")
        ]
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            items.append(URLQueryItem(name: "search", value: trimmed))
        }
        return items
    }
}
