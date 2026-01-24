/**
 * Authentication utilities for managing JWT tokens and API requests.
 * Handles token storage in localStorage and provides an authenticated fetch wrapper.
 * @module lib/auth
 */

/** Key used for storing the JWT token in localStorage */
const TOKEN_KEY = "token";

/**
 * Retrieves the JWT token from localStorage.
 * @returns The JWT token string, or null if not found or running on server
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Stores the JWT token in localStorage.
 * @param token - The JWT token string to store
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Removes the JWT token from localStorage.
 * Used during logout or when token is invalid.
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Checks if the user is currently authenticated.
 * @returns True if a token exists in localStorage, false otherwise
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Backend API base URL, configurable via NEXT_PUBLIC_API_URL environment variable */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

/**
 * Performs an authenticated API request to the backend.
 * Automatically includes the JWT token in the Authorization header.
 * Redirects to login page on 401 responses.
 *
 * @template T - The expected response type
 * @param endpoint - The API endpoint path (e.g., "/api/projects")
 * @param options - Optional fetch configuration (method, body, headers, etc.)
 * @returns Promise resolving to the parsed JSON response
 * @throws {Error} When the request fails or returns a non-OK status
 *
 * @example
 * // GET request
 * const projects = await apiFetch<Project[]>("/api/projects");
 *
 * @example
 * // POST request
 * const newProject = await apiFetch<Project>("/api/projects", {
 *   method: "POST",
 *   body: JSON.stringify({ name: "My Project" }),
 * });
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    window.location.href = "/login?error=session_expired";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
