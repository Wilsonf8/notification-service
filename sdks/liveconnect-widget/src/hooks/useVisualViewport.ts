/**
 * Custom Preact hook for tracking the Visual Viewport and detecting
 * on-screen keyboard presence on mobile devices.
 *
 * Compares `window.innerHeight` with `visualViewport.height` to
 * estimate the keyboard height and whether it is open.
 */

import { useState, useEffect } from 'preact/hooks';

/** Minimum pixel difference to consider the keyboard open. */
const KEYBOARD_THRESHOLD = 100;

/**
 * State returned by the useVisualViewport hook.
 */
interface VisualViewportState {
  /** Estimated height of the on-screen keyboard in pixels (0 when closed). */
  keyboardHeight: number;
  /** Whether the on-screen keyboard is currently open. */
  isKeyboardOpen: boolean;
}

/**
 * Tracks the Visual Viewport API to detect on-screen keyboard visibility.
 *
 * Uses the difference between `window.innerHeight` and
 * `visualViewport.height` to calculate keyboard height. A 100px threshold
 * distinguishes the keyboard from minor browser chrome adjustments.
 *
 * @returns Visual viewport state with keyboard height and open status
 *
 * @example
 * ```tsx
 * const { isKeyboardOpen, keyboardHeight } = useVisualViewport();
 * ```
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    keyboardHeight: 0,
    isKeyboardOpen: false,
  });

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    /**
     * Recalculates keyboard state from the current viewport dimensions.
     */
    const update = (): void => {
      const diff = window.innerHeight - viewport.height;
      const keyboardHeight = Math.max(0, diff);
      const isKeyboardOpen = keyboardHeight > KEYBOARD_THRESHOLD;
      setState({ keyboardHeight, isKeyboardOpen });
    };

    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return state;
}
