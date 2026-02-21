/**
 * API functions for tier limits.
 * @module lib/api/tier
 */

import { apiFetch } from "@/lib/auth";
import type { TierLimits } from "@/lib/types";

/**
 * Fetches tier limits and current usage for an organization.
 * @param slug - The organization slug
 * @returns Tier limits with current usage data
 */
export async function getTierLimits(slug: string): Promise<TierLimits> {
  return apiFetch<TierLimits>(`/api/organizations/${slug}/tier`);
}
