/**
 * Tour step popover component.
 * Displays step content, progress dots, and navigation buttons.
 * @module components/tour/tour-popover
 */
"use client";

import { useTour } from "@/lib/tour/tour-context";
import { useTourPositioning } from "@/lib/tour/use-tour-positioning";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";

/**
 * Returns CSS for the arrow/caret pointing from the popover toward the target.
 * @param placement - Popover placement relative to target
 * @returns CSS class string for arrow positioning
 */
function getArrowClasses(placement: string): string {
  switch (placement) {
    case "bottom":
      return "absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover ring-1 ring-foreground/10";
    case "top":
      return "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover ring-1 ring-foreground/10";
    case "right":
      return "absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-popover ring-1 ring-foreground/10";
    case "left":
      return "absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-popover ring-1 ring-foreground/10";
    default:
      return "";
  }
}

/**
 * Floating step content card for the product tour.
 * Shows step title, description, progress dots, and Back/Next/Done buttons.
 * Only renders when a tour is active.
 */
export function TourPopover() {
  const {
    isActive,
    activeTour,
    currentStep,
    currentStepIndex,
    nextStep,
    prevStep,
    endTour,
    skipTour,
  } = useTour();

  const { popoverStyle, targetFound } = useTourPositioning(
    currentStep?.target ?? null,
    currentStep?.placement ?? "bottom",
    isActive
  );

  if (!isActive || !activeTour || !currentStep) return null;

  const totalSteps = activeTour.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  // If target not found, still show popover centered
  const style = targetFound
    ? popoverStyle
    : {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320,
      };

  return (
    <div
      className="fixed z-[61] w-80 bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-md p-4"
      style={style}
      role="dialog"
      aria-label={`Tour step ${currentStepIndex + 1} of ${totalSteps}: ${currentStep.title}`}
    >
      {/* Arrow pointing toward target */}
      {targetFound && (
        <div className={getArrowClasses(currentStep.placement)} />
      )}

      {/* Close button */}
      <button
        onClick={skipTour}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close tour"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>

      {/* Step counter */}
      <span className="absolute top-2.5 right-8 text-[10px] text-muted-foreground">
        {currentStepIndex + 1}/{totalSteps}
      </span>

      {/* Step title */}
      <h3 className="text-sm font-semibold mb-1 pr-14">{currentStep.title}</h3>

      {/* Step content */}
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {currentStep.content}
      </p>

      {/* Footer: progress dots + nav buttons */}
      <div className="flex items-center justify-between">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {activeTour.steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-1.5",
                i === currentStepIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-1.5">
          {!isFirstStep && (
            <Button variant="ghost" size="xs" onClick={prevStep}>
              Back
            </Button>
          )}
          {isLastStep ? (
            <Button size="xs" onClick={endTour}>
              Done
            </Button>
          ) : (
            <Button size="xs" onClick={nextStep}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
