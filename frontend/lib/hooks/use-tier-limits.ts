/**
 * Hook for fetching and caching tier limits for an organization.
 * @module lib/hooks/use-tier-limits
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { getTierLimits } from "@/lib/api/tier";
import type { TierLimits } from "@/lib/types";

/**
 * Fetches and caches tier limits for an organization.
 * @param orgSlug - The organization slug
 * @returns Tier limits data, loading state, and refresh function
 */
export function useTierLimits(orgSlug: string | undefined) {
  const [limits, setLimits] = useState<TierLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!orgSlug) return;
    try {
      setLoading(true);
      const data = await getTierLimits(orgSlug);
      setLimits(data);
    } catch {
      // Silently fail — limits stay null
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { limits, loading, refresh };
}
