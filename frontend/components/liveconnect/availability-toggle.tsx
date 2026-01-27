/**
 * Availability toggle component for rep status control.
 * @module components/liveconnect/availability-toggle
 */
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconCircleFilled, IconChevronDown, IconLoader2 } from "@tabler/icons-react";
import type { RepAvailability, RepPresence } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Props for the AvailabilityToggle component */
interface AvailabilityToggleProps {
  availability: RepAvailability;
  presence: RepPresence;
  isUpdating: boolean;
  onAvailabilityChange: (availability: RepAvailability) => Promise<void>;
}

/**
 * Gets display label for availability status.
 */
function getAvailabilityLabel(availability: RepAvailability, presence: RepPresence): string {
  if (presence === "IN_CALL") {
    return "In Call";
  }
  return availability === "AVAILABLE" ? "Available" : "Unavailable";
}

/**
 * Gets color class for status indicator.
 */
function getStatusColor(availability: RepAvailability, presence: RepPresence): string {
  if (presence === "IN_CALL") {
    return "text-yellow-500";
  }
  if (availability === "AVAILABLE") {
    return "text-green-500";
  }
  return "text-muted-foreground";
}

/**
 * Availability toggle dropdown component.
 * Allows reps to change their availability status.
 */
export function AvailabilityToggle({
  availability,
  presence,
  isUpdating,
  onAvailabilityChange,
}: AvailabilityToggleProps) {
  const label = getAvailabilityLabel(availability, presence);
  const colorClass = getStatusColor(availability, presence);

  const handleSelect = async (newAvailability: RepAvailability) => {
    if (newAvailability !== availability) {
      await onAvailabilityChange(newAvailability);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-2 border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        disabled={isUpdating || presence === "IN_CALL"}
      >
        {isUpdating ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconCircleFilled className={cn("h-3 w-3", colorClass)} />
        )}
        <span>{label}</span>
        <IconChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleSelect("AVAILABLE")}
          className="gap-2"
        >
          <IconCircleFilled className="h-3 w-3 text-green-500" />
          <span>Available</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("UNAVAILABLE")}
          className="gap-2"
        >
          <IconCircleFilled className="h-3 w-3 text-muted-foreground" />
          <span>Unavailable</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
