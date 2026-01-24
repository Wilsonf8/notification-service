/**
 * API functions for organization management.
 * @module lib/api/organizations
 */

import { apiFetch } from "@/lib/auth";
import type {
  Organization,
  OrganizationMember,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  AddMemberRequest,
  UpdateMemberRoleRequest,
  Project,
  CreateProjectRequest,
} from "@/lib/types";

/**
 * Fetches all organizations the current user is a member of.
 * @returns Array of organizations with user's role
 */
export async function getOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>("/api/organizations");
}

/**
 * Fetches a single organization by slug.
 * @param slug - The organization's URL slug
 * @returns The organization
 */
export async function getOrganization(slug: string): Promise<Organization> {
  return apiFetch<Organization>(`/api/organizations/${slug}`);
}

/**
 * Creates a new team organization.
 * @param data - The organization data
 * @returns The created organization
 */
export async function createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
  return apiFetch<Organization>("/api/organizations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Updates an organization's details.
 * @param slug - The organization's URL slug
 * @param data - The updated organization data
 * @returns The updated organization
 */
export async function updateOrganization(
  slug: string,
  data: UpdateOrganizationRequest
): Promise<Organization> {
  return apiFetch<Organization>(`/api/organizations/${slug}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Deletes an organization.
 * @param slug - The organization's URL slug
 */
export async function deleteOrganization(slug: string): Promise<void> {
  await apiFetch(`/api/organizations/${slug}`, {
    method: "DELETE",
  });
}

/**
 * Fetches all members of an organization.
 * @param slug - The organization's URL slug
 * @returns Array of organization members
 */
export async function getOrganizationMembers(slug: string): Promise<OrganizationMember[]> {
  return apiFetch<OrganizationMember[]>(`/api/organizations/${slug}/members`);
}

/**
 * Adds a member to an organization by username.
 * @param slug - The organization's URL slug
 * @param data - The member data with username and role
 * @returns The new member
 */
export async function addMemberByUsername(
  slug: string,
  data: AddMemberRequest
): Promise<OrganizationMember> {
  return apiFetch<OrganizationMember>(`/api/organizations/${slug}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Updates a member's role in an organization.
 * @param slug - The organization's URL slug
 * @param memberId - The membership ID
 * @param data - The role update data
 * @returns The updated member
 */
export async function updateMemberRole(
  slug: string,
  memberId: string,
  data: UpdateMemberRoleRequest
): Promise<OrganizationMember> {
  return apiFetch<OrganizationMember>(`/api/organizations/${slug}/members/${memberId}/role`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Removes a member from an organization.
 * @param slug - The organization's URL slug
 * @param memberId - The membership ID
 */
export async function removeMember(slug: string, memberId: string): Promise<void> {
  await apiFetch(`/api/organizations/${slug}/members/${memberId}`, {
    method: "DELETE",
  });
}

/**
 * Allows the current user to leave an organization.
 * @param slug - The organization's URL slug
 */
export async function leaveOrganization(slug: string): Promise<void> {
  await apiFetch(`/api/organizations/${slug}/leave`, {
    method: "POST",
  });
}

/**
 * Fetches all projects for an organization.
 * @param slug - The organization's URL slug
 * @returns Array of projects
 */
export async function getOrganizationProjects(slug: string): Promise<Project[]> {
  return apiFetch<Project[]>(`/api/organizations/${slug}/projects`);
}

/**
 * Creates a project in an organization.
 * @param slug - The organization's URL slug
 * @param data - The project data
 * @returns The created project
 */
export async function createOrganizationProject(
  slug: string,
  data: CreateProjectRequest
): Promise<Project> {
  return apiFetch<Project>(`/api/organizations/${slug}/projects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
