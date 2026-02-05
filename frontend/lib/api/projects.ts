/**
 * API functions for project management.
 * @module lib/api/projects
 */

import { apiFetch } from "@/lib/auth";
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
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
