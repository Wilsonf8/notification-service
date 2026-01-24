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
