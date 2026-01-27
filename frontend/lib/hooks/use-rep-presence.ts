/**
 * Hook for managing rep presence and availability.
 * Handles availability toggling and presence state synchronization.
 * @module lib/hooks/use-rep-presence
 */

import { useState, useCallback, useEffect } from "react";
import { updateAvailability } from "@/lib/api/liveconnect-dashboard";
import type { RepAvailability, RepPresence } from "@/lib/types";

/** Hook return type */
export interface UseRepPresenceReturn {
  availability: RepAvailability;
  presence: RepPresence;
  isUpdating: boolean;
  error: string | null;
  setAvailability: (availability: RepAvailability) => Promise<void>;
  toggleAvailability: () => Promise<void>;
}

/**
 * Custom hook for managing rep availability and presence.
 *
 * @param projectId - The project ID
 * @param initialAvailability - Initial availability state
 * @param initialPresence - Initial presence state
 * @returns Object containing availability, presence, and control functions
 */
export function useRepPresence(
  projectId: string,
  initialAvailability: RepAvailability = "UNAVAILABLE",
  initialPresence: RepPresence = "OFFLINE"
): UseRepPresenceReturn {
  const [availability, setAvailabilityState] =
    useState<RepAvailability>(initialAvailability);
  const [presence, setPresence] = useState<RepPresence>(initialPresence);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial values when they change (e.g., from API fetch)
  useEffect(() => {
    setAvailabilityState(initialAvailability);
  }, [initialAvailability]);

  useEffect(() => {
    setPresence(initialPresence);
  }, [initialPresence]);

  /**
   * Updates the rep's availability status.
   */
  const setAvailability = useCallback(
    async (newAvailability: RepAvailability) => {
      if (!projectId) return;

      setIsUpdating(true);
      setError(null);

      try {
        const apiValue =
          newAvailability === "AVAILABLE" ? "available" : "unavailable";
        const updatedRep = await updateAvailability(projectId, apiValue);

        setAvailabilityState(updatedRep.availability);
        setPresence(updatedRep.presence);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to update availability";
        setError(message);
        throw e;
      } finally {
        setIsUpdating(false);
      }
    },
    [projectId]
  );

  /**
   * Toggles availability between AVAILABLE and UNAVAILABLE.
   */
  const toggleAvailability = useCallback(async () => {
    const newAvailability =
      availability === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
    await setAvailability(newAvailability);
  }, [availability, setAvailability]);

  return {
    availability,
    presence,
    isUpdating,
    error,
    setAvailability,
    toggleAvailability,
  };
}
