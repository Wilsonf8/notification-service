/**
 * Tour spotlight overlay component.
 * Renders a semi-transparent backdrop with a cutout around the target element.
 * @module components/tour/tour-overlay
 */
"use client";

import { useTour } from "@/lib/tour/tour-context";
import { useTourPositioning } from "@/lib/tour/use-tour-positioning";

/**
 * Spotlight overlay that highlights the current tour step target.
 * Uses box-shadow technique for the cutout effect.
 * Only renders when a tour is active.
 */
export function TourOverlay() {
  const { isActive, currentStep, skipTour } = useTour();
  const { targetRect, targetFound } = useTourPositioning(
    currentStep?.target ?? null,
    currentStep?.placement ?? "bottom",
    isActive
  );

  if (!isActive) return null;

  return (
    <>
      {/* Clickable backdrop behind spotlight — catches clicks outside target */}
      <div
        className="fixed inset-0 z-[59]"
        onClick={skipTour}
        aria-hidden="true"
      />

      {/* Spotlight cutout using box-shadow */}
      {targetFound && targetRect && (
        <div
          className="fixed z-[60] pointer-events-none transition-all duration-300 ease-in-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px oklch(0 0 0 / 60%)",
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
