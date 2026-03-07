/**
 * Type definitions for the product tour system.
 * @module lib/tour/types
 */

/** Placement options for the tour popover relative to the target element */
export type TourPlacement = "top" | "bottom" | "left" | "right";

/**
 * A single step within a product tour.
 */
export interface TourStep {
  /** CSS selector using data-tour attribute, e.g. '[data-tour="sidebar-nav"]' */
  target: string;
  /** Step heading displayed in the popover */
  title: string;
  /** Step body text explaining the feature */
  content: string;
  /** Popover placement relative to the target element */
  placement: TourPlacement;
  /** Optional route to navigate to before showing this step */
  route?: string;
}

/**
 * Complete tour definition containing metadata and ordered steps.
 */
export interface TourDefinition {
  /** Unique tour identifier */
  id: string;
  /** Display name shown in the launcher dropdown */
  title: string;
  /** Short description shown in the launcher dropdown */
  description: string;
  /** Ordered list of tour steps */
  steps: TourStep[];
}

/**
 * Context value provided by TourProvider.
 */
export interface TourContextValue {
  /** Whether a tour is currently running */
  isActive: boolean;
  /** The currently running tour definition, or null */
  activeTour: TourDefinition | null;
  /** Zero-based index of the current step */
  currentStepIndex: number;
  /** The current step object, or null if no tour is active */
  currentStep: TourStep | null;
  /** Start a tour by its ID */
  startTour: (tourId: string) => void;
  /** Advance to the next step, or end the tour if on the last step */
  nextStep: () => void;
  /** Go back one step */
  prevStep: () => void;
  /** End the tour and mark it as completed */
  endTour: () => void;
  /** End the tour without marking it as completed */
  skipTour: () => void;
  /** Set of completed tour IDs persisted in localStorage */
  completedTours: Set<string>;
}
