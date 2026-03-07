/**
 * API functions for user management.
 * @module lib/api/user
 */

import { apiFetch } from "@/lib/auth";
import type { User } from "@/lib/types";

/**
 * Fetches the current authenticated user's profile.
 * @returns The user profile
 */
export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/api/auth/me");
}

/**
 * Updates the current user's profile (first name, last name).
 * @param firstName - The user's first name (or null to clear)
 * @param lastName - The user's last name (or null to clear)
 * @returns The updated user profile
 */
export async function updateProfile(
  firstName: string | null,
  lastName: string | null
): Promise<User> {
  return apiFetch<User>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify({ firstName, lastName }),
  });
}
