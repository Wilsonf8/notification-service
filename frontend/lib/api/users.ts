/**
 * API functions for user search.
 * @module lib/api/users
 */

import { apiFetch } from "@/lib/auth";
import type { UserSearchResult } from "@/lib/types";

/**
 * Searches users by username, email, first name, or last name.
 * Excludes members of the specified organization.
 *
 * @param query - The search term (minimum 2 characters)
 * @param excludeOrgId - The organization ID whose members to exclude
 * @returns Array of matching users (max 8 results)
 */
export async function searchUsers(
  query: string,
  excludeOrgId: string
): Promise<UserSearchResult[]> {
  const params = new URLSearchParams({ q: query, excludeOrgId });
  return apiFetch<UserSearchResult[]>(`/api/users/search?${params}`);
}
