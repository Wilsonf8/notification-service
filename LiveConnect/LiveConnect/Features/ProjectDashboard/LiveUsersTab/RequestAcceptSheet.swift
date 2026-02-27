//
//  RequestAcceptSheet.swift
//  LiveConnect
//
//  Created by Claude on 2/10/26.
//

import SwiftUI

/// Sheet displayed when a rep taps a visitor request notification.
/// Shows visitor details and allows accepting or declining the request.
struct RequestAcceptSheet: View {
    let projectId: UUID
    let requestId: UUID
    let onCallAccepted: (AcceptedCallResponse, String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var request: Request?
    @State private var isLoading = true
    @State private var isAccepting = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if let request = request {
                    requestContent(request)
                } else if isLoading {
                    loadingView
                } else {
                    expiredView
                }
            }
            .navigationTitle("Call Request")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .presentationDetents([.medium])
        .task { await loadRequest() }
    }

    // MARK: - Request Content

    @ViewBuilder
    private func requestContent(_ request: Request) -> some View {
        VStack(spacing: 24) {
            // Visitor avatar
            Circle()
                .fill(Color.yellow.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay(
                    Text(request.visitor.displayName.prefix(1).uppercased())
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(.yellow)
                )

            // Visitor info
            VStack(spacing: 8) {
                Text(request.visitor.displayName)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)

                if let email = request.visitor.email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Context info
            VStack(spacing: 12) {
                if let page = request.visitor.currentPage {
                    Label(formatPageUrl(page), systemImage: "globe")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Label(formatWaitTime(request.expiresAt), systemImage: "clock")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let error = error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Spacer()

            // Action buttons
            VStack(spacing: 12) {
                Button {
                    Task { await acceptRequest() }
                } label: {
                    HStack {
                        if isAccepting {
                            ProgressView()
                                .tint(.black)
                        } else {
                            Image(systemName: "video.fill")
                        }
                        Text("Accept Call")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.yellow)
                    .foregroundStyle(.black)
                    .fontWeight(.semibold)
                }
                .disabled(isAccepting)

                Button {
                    Task { await declineRequest() }
                } label: {
                    Text("Decline")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white.opacity(0.1))
                        .foregroundStyle(.white)
                }
            }
        }
        .padding(24)
        .background(Color.black)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(.white)
            Text("Loading request...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    // MARK: - Expired View

    private var expiredView: some View {
        VStack(spacing: 16) {
            Image(systemName: "clock.badge.xmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Request Expired")
                .font(.headline)
                .foregroundStyle(.white)

            Text("This request is no longer available.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Close") { dismiss() }
                .padding(.top)
                .foregroundStyle(.yellow)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    // MARK: - Actions

    private func loadRequest() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Fetch pending requests and find the one we're looking for
            let response: VisitorListResponse = try await APIClient.shared.get(
                Endpoints.visitors(projectId: projectId)
            )

            // Find the request in the queue
            if let found = response.queue.first(where: { $0.id == requestId }) {
                self.request = found
            } else {
                // Request not found - probably expired or already handled
                self.request = nil
            }
        } catch {
            print("Failed to load request: \(error.localizedDescription)")
            self.request = nil
        }
    }

    private func acceptRequest() async {
        isAccepting = true
        error = nil

        do {
            let response: AcceptedCallResponse = try await APIClient.shared.post(
                Endpoints.acceptRequest(projectId: projectId, requestId: requestId)
            )

            // Dismiss sheet and start call
            dismiss()
            onCallAccepted(response, request?.visitor.name)
        } catch {
            self.error = error.localizedDescription
        }

        isAccepting = false
    }

    private func declineRequest() async {
        do {
            try await APIClient.shared.post(
                Endpoints.dismissRequest(projectId: projectId, requestId: requestId),
                body: Optional<String>.none
            )
        } catch {
            print("Failed to dismiss request: \(error.localizedDescription)")
        }
        dismiss()
    }

    // MARK: - Helpers

    private func formatPageUrl(_ url: String) -> String {
        // Extract just the path from the URL
        if let parsed = URL(string: url) {
            return parsed.path.isEmpty ? "/" : parsed.path
        }
        return url
    }

    private func formatWaitTime(_ expiresAt: Date) -> String {
        let remaining = expiresAt.timeIntervalSinceNow
        if remaining > 0 {
            return "Expires in \(Int(remaining))s"
        } else {
            return "Expired"
        }
    }
}

#Preview {
    RequestAcceptSheet(
        projectId: UUID(),
        requestId: UUID()
    ) { _, _ in }
}
