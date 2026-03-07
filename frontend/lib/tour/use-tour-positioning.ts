/**
 * Custom hook for computing tour popover and spotlight positioning.
 * Uses getBoundingClientRect with resize/scroll listeners for dynamic repositioning.
 * @module lib/tour/use-tour-positioning
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import type { TourPlacement } from "./types";

/** Padding around the spotlight cutout in pixels */
const SPOTLIGHT_PADDING = 8;

/** Gap between target element and popover in pixels */
const POPOVER_GAP = 12;

/** Minimum margin from viewport edges in pixels */
const VIEWPORT_MARGIN = 16;

/** Width of the popover in pixels */
const POPOVER_WIDTH = 320;

/** Estimated popover height for clamping */
const POPOVER_HEIGHT_ESTIMATE = 180;

/**
 * Return value from the useTourPositioning hook.
 */
export interface TourPositioning {
  /** Bounding rect of the target element with spotlight padding */
  targetRect: { top: number; left: number; width: number; height: number } | null;
  /** CSS style object for positioning the popover */
  popoverStyle: CSSProperties;
  /** Whether the target element was found and visible in the DOM */
  targetFound: boolean;
}

/**
 * Checks if an element is visible (not hidden via CSS display/visibility).
 * @param el - The element to check
 * @returns True if the element is visible
 */
function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

/**
 * Computes the popover position based on target rect and placement.
 * @param rect - Target element bounding rect
 * @param placement - Desired placement relative to target
 * @returns CSS properties for popover positioning
 */
function computePopoverStyle(
  rect: DOMRect,
  placement: TourPlacement
): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number;
  let left: number;

  switch (placement) {
    case "bottom":
      top = rect.bottom + POPOVER_GAP;
      left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
      break;
    case "top":
      top = rect.top - POPOVER_GAP - POPOVER_HEIGHT_ESTIMATE;
      left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
      break;
    case "right":
      top = rect.top + rect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
      left = rect.right + POPOVER_GAP;
      break;
    case "left":
      top = rect.top + rect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
      left = rect.left - POPOVER_GAP - POPOVER_WIDTH;
      break;
  }

  // Clamp to viewport
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - POPOVER_WIDTH - VIEWPORT_MARGIN));
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - POPOVER_HEIGHT_ESTIMATE - VIEWPORT_MARGIN));

  return {
    position: "fixed" as const,
    top,
    left,
    width: POPOVER_WIDTH,
  };
}

/**
 * Hook that computes positioning for the tour spotlight and popover.
 * Continuously tracks the target element's position via requestAnimationFrame.
 * @param target - CSS selector for the target element, or null
 * @param placement - Desired popover placement
 * @param isActive - Whether the tour is currently active
 * @returns Positioning data for spotlight and popover
 */
export function useTourPositioning(
  target: string | null,
  placement: TourPlacement,
  isActive: boolean
): TourPositioning {
  const [positioning, setPositioning] = useState<TourPositioning>({
    targetRect: null,
    popoverStyle: { position: "fixed" as const, top: 0, left: 0 },
    targetFound: false,
  });

  const rafRef = useRef<number>(0);
  const prevRectRef = useRef<string>("");
  const hasScrolledRef = useRef(false);

  const updatePosition = useCallback(() => {
    if (!target) {
      setPositioning({ targetRect: null, popoverStyle: { position: "fixed", top: 0, left: 0 }, targetFound: false });
      return;
    }

    const el = document.querySelector(target);
    if (!el || !isElementVisible(el)) {
      setPositioning({ targetRect: null, popoverStyle: { position: "fixed", top: 0, left: 0 }, targetFound: false });
      return;
    }

    // Scroll into view on first find
    if (!hasScrolledRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      hasScrolledRef.current = true;
    }

    const rect = el.getBoundingClientRect();
    const rectKey = `${rect.top},${rect.left},${rect.width},${rect.height}`;

    // Only update state if rect actually changed
    if (rectKey !== prevRectRef.current) {
      prevRectRef.current = rectKey;

      const spotlightRect = {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      };

      setPositioning({
        targetRect: spotlightRect,
        popoverStyle: computePopoverStyle(rect, placement),
        targetFound: true,
      });
    }
  }, [target, placement]);

  useEffect(() => {
    if (!isActive || !target) {
      prevRectRef.current = "";
      hasScrolledRef.current = false;
      return;
    }

    // Reset scroll tracking for new target
    hasScrolledRef.current = false;
    prevRectRef.current = "";

    // Start RAF loop
    const tick = () => {
      updatePosition();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, target, updatePosition]);

  return positioning;
}
