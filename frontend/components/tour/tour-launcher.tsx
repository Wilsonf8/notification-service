/**
 * Tour launcher button with dropdown menu.
 * Displays available tours with completion status.
 * @module components/tour/tour-launcher
 */
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconHelp, IconCheck } from "@tabler/icons-react";
import { useTour } from "@/lib/tour/tour-context";
import { TOURS } from "@/lib/tour/tours";

/**
 * Header button that opens a dropdown menu of available product tours.
 * Shows a checkmark next to completed tours.
 */
export function TourLauncher() {
  const { startTour, completedTours } = useTour();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Product tours"
            data-tour="tour-launcher"
          />
        }
      >
        <IconHelp className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>How To</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TOURS.map((tour) => (
          <DropdownMenuItem
            key={tour.id}
            onClick={() => startTour(tour.id)}
          >
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="font-medium">{tour.title}</span>
              <span className="text-muted-foreground text-[10px]">
                {tour.description}
              </span>
            </div>
            {completedTours.has(tour.id) && (
              <IconCheck className="ml-auto h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
