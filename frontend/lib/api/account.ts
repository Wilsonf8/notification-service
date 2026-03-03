import { apiFetch } from "@/lib/auth";

/**
 * Response from the deletion preflight check.
 */
export interface DeletionPreflightResponse {
  canDelete: boolean;
  blockers: {
    organizationId: string;
    name: string;
    slug: string;
  }[];
}

/**
 * Checks for blockers preventing account deletion.
 * @returns preflight response with deletion eligibility and any blockers
 */
export async function deletionPreflight(): Promise<DeletionPreflightResponse> {
  return apiFetch<DeletionPreflightResponse>("/api/users/me/deletion-preflight");
}

/**
 * Initiates account soft-deletion with a 30-day grace period.
 */
export async function deleteAccount(): Promise<void> {
  await apiFetch<Record<string, never>>("/api/users/me", { method: "DELETE" });
}

/**
 * Reactivates a soft-deleted account during the grace period.
 */
export async function reactivateAccount(): Promise<void> {
  await apiFetch<Record<string, never>>("/api/users/me/reactivate", {
    method: "POST",
  });
}
