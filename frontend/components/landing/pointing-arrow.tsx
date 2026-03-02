/**
 * Animated arrow that rotates to always point toward the LiveConnect widget FAB.
 * Uses viewport-relative geometry to calculate the angle on every scroll/resize frame.
 * @module components/landing/pointing-arrow
 */
"use client";

import { useRef, useEffect } from "react";
import { IconArrowRight } from "@tabler/icons-react";

/** Widget FAB position constants (must match widget CSS). */
const FAB_SIZE_DESKTOP = 56;
const FAB_OFFSET_DESKTOP = 24;
const FAB_SIZE_MOBILE = 52;
const FAB_OFFSET_MOBILE = 16;
const MOBILE_BREAKPOINT = 480;

/**
 * Renders an arrow with a pulsing glow that dynamically rotates to always
 * point toward the fixed LiveConnect widget button in the bottom-right corner.
 * Attaches scroll and resize listeners to update the rotation angle in real time.
 */
export function PointingArrow() {
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const arrowEl = arrowRef.current;
    if (!arrowEl) return;

    let rafId: number | null = null;

    /**
     * Computes the angle from the arrow's center to the widget FAB center
     * (both in viewport coordinates) and applies it as a CSS rotation.
     */
    const update = () => {
      const rect = arrowEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      const fabSize = isMobile ? FAB_SIZE_MOBILE : FAB_SIZE_DESKTOP;
      const fabOffset = isMobile ? FAB_OFFSET_MOBILE : FAB_OFFSET_DESKTOP;

      const tx = window.innerWidth - fabOffset - fabSize / 2;
      const ty = window.innerHeight - fabOffset - fabSize / 2;

      const radians = Math.atan2(ty - cy, tx - cx);
      const deg = radians * (180 / Math.PI);

      arrowEl.style.transform = `rotate(${deg}deg)`;
      rafId = null;
    };

    /** Schedules an update if one is not already pending. */
    const scheduleUpdate = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    };

    update();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
        Try it out
      </span>
      <div className="relative inline-flex items-center justify-center">
        <span className="absolute h-10 w-10 animate-ping bg-primary/20 motion-reduce:animate-none" />
        <div
          ref={arrowRef}
          className="pointing-arrow-pulse h-10 w-10 flex items-center justify-center text-primary"
          aria-hidden="true"
        >
          <IconArrowRight className="h-6 w-6" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
