//
//  APIClient.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// HTTP client with authentication token injection.
@Observable
final class APIClient: Sendable {
    /// Shared singleton instance.
    static let shared = APIClient()

    /// Custom JSON decoder configured for the API.
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    /// Custom JSON encoder configured for the API.
    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private init() {}

    // MARK: - Public Methods

    /// Performs a GET request.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - queryItems: Optional query parameters.
    /// - Returns: Decoded response of type T.
    /// - Throws: APIError if request fails.
    func get<T: Decodable>(_ endpoint: String, queryItems: [URLQueryItem]? = nil) async throws -> T {
        let request = try buildRequest(endpoint: endpoint, method: "GET", queryItems: queryItems)
        return try await perform(request)
    }

    /// Performs a POST request.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - body: Optional request body.
    /// - Returns: Decoded response of type T.
    /// - Throws: APIError if request fails.
    func post<T: Decodable, B: Encodable>(_ endpoint: String, body: B?) async throws -> T {
        var request = try buildRequest(endpoint: endpoint, method: "POST")
        if let body {
            request.httpBody = try encoder.encode(body)
        }
        return try await perform(request)
    }

    /// Performs a POST request with no request body.
    /// - Parameter endpoint: The API endpoint path.
    /// - Returns: Decoded response of type T.
    /// - Throws: APIError if request fails.
    func post<T: Decodable>(_ endpoint: String) async throws -> T {
        let request = try buildRequest(endpoint: endpoint, method: "POST")
        return try await perform(request)
    }

    /// Performs a POST request with no response body.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - body: Optional request body.
    /// - Throws: APIError if request fails.
    func post<B: Encodable>(_ endpoint: String, body: B?) async throws {
        var request = try buildRequest(endpoint: endpoint, method: "POST")
        if let body {
            request.httpBody = try encoder.encode(body)
        }
        _ = try await performRaw(request)
    }

    /// Performs a PUT request.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - body: Optional request body.
    /// - Returns: Decoded response of type T.
    /// - Throws: APIError if request fails.
    func put<T: Decodable, B: Encodable>(_ endpoint: String, body: B?) async throws -> T {
        var request = try buildRequest(endpoint: endpoint, method: "PUT")
        if let body {
            request.httpBody = try encoder.encode(body)
        }
        return try await perform(request)
    }

    /// Performs a PUT request with no response body.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - body: Optional request body.
    /// - Throws: APIError if request fails.
    func put<B: Encodable>(_ endpoint: String, body: B?) async throws {
        var request = try buildRequest(endpoint: endpoint, method: "PUT")
        if let body {
            request.httpBody = try encoder.encode(body)
        }
        _ = try await performRaw(request)
    }

    /// Performs a DELETE request.
    /// - Parameter endpoint: The API endpoint path.
    /// - Throws: APIError if request fails.
    func delete(_ endpoint: String) async throws {
        let request = try buildRequest(endpoint: endpoint, method: "DELETE")
        _ = try await performRaw(request)
    }

    // MARK: - Private Methods

    /// Builds a URLRequest with authentication.
    /// - Parameters:
    ///   - endpoint: The API endpoint path.
    ///   - method: HTTP method.
    ///   - queryItems: Optional query parameters.
    /// - Returns: Configured URLRequest.
    /// - Throws: APIError if URL construction fails.
    private func buildRequest(
        endpoint: String,
        method: String,
        queryItems: [URLQueryItem]? = nil
    ) throws -> URLRequest {
        guard var components = URLComponents(string: Endpoints.baseURL + endpoint) else {
            throw APIError.invalidURL
        }

        if let queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Inject auth token if available
        if let token = KeychainService.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    /// Performs a request and decodes the response.
    /// - Parameter request: The URLRequest to perform.
    /// - Returns: Decoded response of type T.
    /// - Throws: APIError if request fails.
    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        try validateResponse(httpResponse, data: data)

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    /// Performs a request without decoding the response.
    /// - Parameter request: The URLRequest to perform.
    /// - Returns: Response data.
    /// - Throws: APIError if request fails.
    private func performRaw(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        try validateResponse(httpResponse, data: data)
        return data
    }

    /// Validates HTTP response status code.
    /// - Parameters:
    ///   - response: The HTTP response.
    ///   - data: Response data for error messages.
    /// - Throws: APIError for non-success status codes.
    private func validateResponse(_ response: HTTPURLResponse, data: Data) throws {
        switch response.statusCode {
        case 200...299:
            return
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 422:
            throw APIError.validationError(String(data: data, encoding: .utf8))
        case 500...599:
            throw APIError.serverError(response.statusCode)
        default:
            throw APIError.httpError(response.statusCode)
        }
    }
}

// MARK: - APIError

/// Errors that can occur during API requests.
enum APIError: LocalizedError, Sendable {
    case invalidURL
    case invalidResponse
    case unauthorized
    case forbidden
    case notFound
    case validationError(String?)
    case serverError(Int)
    case httpError(Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Please log in to continue"
        case .forbidden:
            return "You don't have permission to access this resource"
        case .notFound:
            return "Resource not found"
        case .validationError(let message):
            return message ?? "Validation error"
        case .serverError(let code):
            return "Server error (\(code))"
        case .httpError(let code):
            return "HTTP error (\(code))"
        case .decodingError:
            return "Failed to parse response"
        case .networkError:
            return "Network error. Please check your connection"
        }
    }
}
