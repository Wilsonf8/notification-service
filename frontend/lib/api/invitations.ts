/**
 * API functions for organization invitations.
 * @module lib/api/invitations
 */

import { apiFetch } from "@/lib/auth";
import type {
  OrganizationInvitation,
  CreateInvitationRequest,
} from "@/lib/types";

/**
 * Creates an invitation for a user to join an organization.
 *
 * @param slug - The organization's URL slug
 * @param data - The invitation data with userId and role
 * @returns The created invitation
 */
export async function createInvitation(
  slug: string,
  data: CreateInvitationRequest
): Promise<OrganizationInvitation> {
  return apiFetch<OrganizationInvitation>(
    `/api/organizations/${slug}/invitations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Fetches pending invitations for an organization.
 *
 * @param slug - The organization's URL slug
 * @returns Array of pending invitations
 */
export async function getOrgInvitations(
  slug: string
): Promise<OrganizationInvitation[]> {
  return apiFetch<OrganizationInvitation[]>(
    `/api/organizations/${slug}/invitations`
  );
}

/**
 * Revokes a pending invitation.
 *
 * @param slug - The organization's URL slug
 * @param invitationId - The invitation ID
 */
export async function revokeInvitation(
  slug: string,
  invitationId: string
): Promise<void> {
  await apiFetch(`/api/organizations/${slug}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

/**
 * Fetches all pending invitations for the current user.
 *
 * @returns Array of pending invitations
 */
export async function getPendingInvitations(): Promise<
  OrganizationInvitation[]
> {
  return apiFetch<OrganizationInvitation[]>("/api/invitations/pending");
}

/**
 * Fetches the count of pending invitations for the current user.
 *
 * @returns Object with count property
 */
export async function getPendingInvitationCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/api/invitations/pending/count");
}

/**
 * Accepts a pending invitation.
 *
 * @param invitationId - The invitation ID
 * @returns The accepted invitation
 */
export async function acceptInvitation(
  invitationId: string
): Promise<OrganizationInvitation> {
  return apiFetch<OrganizationInvitation>(
    `/api/invitations/${invitationId}/accept`,
    { method: "POST" }
  );
}

/**
 * Declines a pending invitation.
 *
 * @param invitationId - The invitation ID
 * @returns The declined invitation
 */
export async function declineInvitation(
  invitationId: string
): Promise<OrganizationInvitation> {
  return apiFetch<OrganizationInvitation>(
    `/api/invitations/${invitationId}/decline`,
    { method: "POST" }
  );
}
