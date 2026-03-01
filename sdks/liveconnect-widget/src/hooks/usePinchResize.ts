/**
 * Custom Preact hook for pinch-to-resize gesture on touch devices.
 * Uses Touch Events API for multi-touch detection (Pointer Events doesn't
 * map well to simultaneous two-finger gestures).
 */

import { useRef, useState, useEffect, useCallback } from 'preact/hooks';
import type { RefObject } from 'preact';

/**
 * Options for the usePinchResize hook.
 */
interface UsePinchResizeOptions {
  /** When true, pinch resizing is disabled */
  disabled?: boolean;
  /** Minimum size in pixels (default: 140) */
  minSize?: number;
  /** Maximum size in pixels (default: 70% of viewport smallest dimension) */
  maxSize?: number;
  /** Initial size in pixels (default: 160) */
  initialSize?: number;
  /** Callback fired when the size changes (on pinch end) */
  onSizeChange?: (size: number) => void;
}

/**
 * Return type for the usePinchResize hook.
 */
interface UsePinchResizeReturn {
  /** Ref to attach to the resizable container element */
  containerRef: RefObject<HTMLDivElement>;
  /** Current size in pixels */
  size: number;
  /** Whether the user is currently pinching */
  isPinching: boolean;
  /** Mutable ref for isPinching state (for use by other hooks like useDraggable) */
  isPinchingRef: RefObject<boolean>;
  /** Imperative setter for size (e.g. restoring from storage) */
  setSize: (size: number) => void;
}

/**
 * Computes the distance between two touch points.
 * @param t1 - First touch point
 * @param t2 - Second touch point
 * @returns Distance in pixels
 */
function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Returns the maximum allowed PiP size (70% of the viewport's smallest dimension).
 * Uses visualViewport when available (iOS Safari).
 * @returns Max size in pixels
 */
function getMaxViewportSize(): number {
  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  return Math.floor(Math.min(vw, vh) * 0.7);
}

/**
 * Hook that enables pinch-to-resize on a container element.
 * Two-finger pinch scales the element between minSize and maxSize.
 * Prevents default to avoid page zoom during pinch.
 *
 * @param options - Configuration options
 * @returns Refs, state, and setter to wire up pinch resizing
 */
export function usePinchResize(options: UsePinchResizeOptions = {}): UsePinchResizeReturn {
  const {
    disabled = false,
    minSize = 140,
    maxSize,
    initialSize = 160,
    onSizeChange,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSizeState] = useState<number>(initialSize);
  const [isPinching, setIsPinching] = useState<boolean>(false);

  // Mutable refs for intermediate calculations (performance)
  const isPinchingRef = useRef<boolean>(false);
  const initialDistanceRef = useRef<number>(0);
  const initialSizeRef = useRef<number>(initialSize);
  const currentSizeRef = useRef<number>(initialSize);
  const rafRef = useRef<number>(0);
  const onSizeChangeRef = useRef(onSizeChange);

  // Keep callback ref fresh
  useEffect(() => {
    onSizeChangeRef.current = onSizeChange;
  }, [onSizeChange]);

  /**
   * Imperative setter that syncs both state and ref.
   */
  const setSize = useCallback((newSize: number) => {
    currentSizeRef.current = newSize;
    setSizeState(newSize);
  }, []);

  useEffect(() => {
    if (disabled) {
      isPinchingRef.current = false;
      setIsPinching(false);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length !== 2) return;

      // Prevent page zoom
      e.preventDefault();

      isPinchingRef.current = true;
      setIsPinching(true);
      initialDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      initialSizeRef.current = currentSizeRef.current;
    };

    const onTouchMove = (e: TouchEvent): void => {
      if (!isPinchingRef.current || e.touches.length !== 2) return;

      // Prevent page zoom
      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      const effectiveMax = maxSize ?? getMaxViewportSize();
      const newSize = Math.round(
        Math.max(minSize, Math.min(initialSizeRef.current * scale, effectiveMax))
      );

      // Use rAF for smooth updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        currentSizeRef.current = newSize;
        setSizeState(newSize);
      });
    };

    const onTouchEnd = (e: TouchEvent): void => {
      if (!isPinchingRef.current) return;

      // End pinch when fewer than 2 touches remain
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        setIsPinching(false);

        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }

        onSizeChangeRef.current?.(currentSizeRef.current);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [disabled, minSize, maxSize]);

  return { containerRef, size, isPinching, isPinchingRef, setSize };
}
