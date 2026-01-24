/**
 * API functions for project management.
 * @module lib/api/projects
 */

import { apiFetch } from "@/lib/auth";
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ApiKey,
  ApiKeyWithSecret,
  Event,
  ConnectToken,
} from "@/lib/types";

/**
 * Fetches all projects for the current user.
 * @returns Array of projects
 */
export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/projects");
}

/**
 * Fetches a single project by ID.
 * @param id - The project ID
 * @returns The project
 */
export async function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`);
}

/**
 * Creates a new project.
 * @param data - The project data
 * @returns The created project
 */
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing project.
 * @param id - The project ID
 * @param data - The updated project data
 * @returns The updated project
 */
export async function updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a project.
 * @param id - The project ID
 */
export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

/**
 * Fetches all API keys for a project.
 * @param projectId - The project ID
 * @returns Array of API keys (without secrets)
 */
export async function getProjectApiKeys(projectId: string): Promise<ApiKey[]> {
  return apiFetch<ApiKey[]>(`/api/projects/${projectId}/api-keys`);
}

/**
 * Generates a new API key for a project.
 * @param projectId - The project ID
 * @param name - Optional name for the API key
 * @returns The new API key with the secret (only shown once)
 */
export async function generateApiKey(projectId: string, name?: string): Promise<ApiKeyWithSecret> {
  return apiFetch<ApiKeyWithSecret>(`/api/projects/${projectId}/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name: name || `Key ${new Date().toLocaleDateString()}` }),
  });
}

/**
 * Revokes an API key.
 * @param projectId - The project ID
 * @param keyId - The API key ID to revoke
 */
export async function revokeApiKey(projectId: string, keyId: string): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/api-keys/${keyId}`, {
    method: "DELETE",
  });
}

/**
 * Fetches recent events for a project.
 * @param projectId - The project ID
 * @returns Array of events
 */
export async function getProjectEvents(projectId: string): Promise<Event[]> {
  return apiFetch<Event[]>(`/api/projects/${projectId}/events`);
}

/** Project statistics response */
export interface ProjectStats {
  totalEvents: number;
  connectedChats: number;
}

/**
 * Fetches statistics for a project.
 * @param projectId - The project ID
 * @returns Project statistics
 */
export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  return apiFetch<ProjectStats>(`/api/projects/${projectId}/stats`);
}

/**
 * Generates a Telegram connect token for a project.
 * @param projectId - The project ID
 * @returns Connect token with deep link to open Telegram
 */
export async function generateTelegramConnectToken(projectId: string): Promise<ConnectToken> {
  return apiFetch<ConnectToken>(`/api/projects/${projectId}/telegram/connect`, {
    method: "POST",
  });
}

/**
 * Disconnects Telegram from a project.
 * @param projectId - The project ID
 */
export async function disconnectTelegram(projectId: string): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/telegram`, {
    method: "DELETE",
  });
}
