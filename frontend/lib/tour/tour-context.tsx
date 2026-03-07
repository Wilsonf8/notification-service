/**
 * Tour context provider and hook.
 * Manages tour state machine, keyboard navigation, and localStorage persistence.
 * @module lib/tour/tour-context
 */
"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { TourContextValue, TourDefinition, TourStep } from "./types";
import { TOURS } from "./tours";

/** localStorage key for completed tour IDs */
const STORAGE_KEY = "tour-completed";

// -- State --

interface TourState {
  activeTour: TourDefinition | null;
  currentStepIndex: number;
  completedTourIds: string[];
}

type TourAction =
  | { type: "START_TOUR"; tour: TourDefinition }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "END_TOUR" }
  | { type: "SKIP_TOUR" };

/**
 * Loads completed tour IDs from localStorage.
 * @returns Array of completed tour IDs
 */
function loadCompletedTours(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves completed tour IDs to localStorage.
 * @param ids - Array of completed tour IDs
 */
function saveCompletedTours(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "START_TOUR":
      return { ...state, activeTour: action.tour, currentStepIndex: 0 };

    case "NEXT_STEP": {
      if (!state.activeTour) return state;
      const nextIndex = state.currentStepIndex + 1;
      if (nextIndex >= state.activeTour.steps.length) {
        // Tour complete — mark as completed
        const newCompleted = state.completedTourIds.includes(state.activeTour.id)
          ? state.completedTourIds
          : [...state.completedTourIds, state.activeTour.id];
        saveCompletedTours(newCompleted);
        return { activeTour: null, currentStepIndex: 0, completedTourIds: newCompleted };
      }
      return { ...state, currentStepIndex: nextIndex };
    }

    case "PREV_STEP":
      return {
        ...state,
        currentStepIndex: Math.max(0, state.currentStepIndex - 1),
      };

    case "END_TOUR": {
      if (!state.activeTour) return { ...state, activeTour: null, currentStepIndex: 0 };
      const newCompleted = state.completedTourIds.includes(state.activeTour.id)
        ? state.completedTourIds
        : [...state.completedTourIds, state.activeTour.id];
      saveCompletedTours(newCompleted);
      return { activeTour: null, currentStepIndex: 0, completedTourIds: newCompleted };
    }

    case "SKIP_TOUR":
      return { ...state, activeTour: null, currentStepIndex: 0 };

    default:
      return state;
  }
}

// -- Context --

const TourContext = createContext<TourContextValue | null>(null);

/**
 * Props for the TourProvider component.
 */
interface TourProviderProps {
  /** Child components */
  children: ReactNode;
}

/**
 * Provides tour state and controls to the component tree.
 * Manages keyboard navigation (Escape, ArrowLeft, ArrowRight) and body scroll lock.
 * @param props - Component props
 */
export function TourProvider({ children }: TourProviderProps) {
  const [state, dispatch] = useReducer(tourReducer, {
    activeTour: null,
    currentStepIndex: 0,
    completedTourIds: loadCompletedTours(),
  });

  const isActive = state.activeTour !== null;

  const startTour = useCallback((tourId: string) => {
    const tour = TOURS.find((t) => t.id === tourId);
    if (tour) dispatch({ type: "START_TOUR", tour });
  }, []);

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const endTour = useCallback(() => dispatch({ type: "END_TOUR" }), []);
  const skipTour = useCallback(() => dispatch({ type: "SKIP_TOUR" }), []);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          skipTour();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextStep();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prevStep();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, skipTour, nextStep, prevStep]);

  // Body scroll lock
  useEffect(() => {
    if (!isActive) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isActive]);

  const currentStep: TourStep | null =
    state.activeTour?.steps[state.currentStepIndex] ?? null;

  const completedTours = useMemo(
    () => new Set(state.completedTourIds),
    [state.completedTourIds]
  );

  const value: TourContextValue = useMemo(
    () => ({
      isActive,
      activeTour: state.activeTour,
      currentStepIndex: state.currentStepIndex,
      currentStep,
      startTour,
      nextStep,
      prevStep,
      endTour,
      skipTour,
      completedTours,
    }),
    [
      isActive,
      state.activeTour,
      state.currentStepIndex,
      currentStep,
      startTour,
      nextStep,
      prevStep,
      endTour,
      skipTour,
      completedTours,
    ]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/**
 * Hook to access tour context.
 * Must be used within a TourProvider.
 * @returns Tour context value
 * @throws When used outside of TourProvider
 */
export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
}
