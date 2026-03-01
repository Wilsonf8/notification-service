/**
 * Custom Preact hook for making an element draggable via Pointer Events API.
 * Used to let visitors reposition the video call panel by grabbing the top info bar.
 */

import { useRef, useState, useEffect, useCallback } from 'preact/hooks';
import type { RefObject, Ref } from 'preact';
import { savePanelPosition, getPanelPosition, clearPanelPosition } from '../storage';

/**
 * Options for the useDraggable hook.
 */
interface UseDraggableOptions {
  /** When true, dragging is disabled and position resets */
  disabled?: boolean;
  /** When current === true, pointerdown events are ignored (e.g. during pinch) */
  suppressRef?: RefObject<boolean>;
  /** Default position used when no saved position exists (e.g. PiP initial placement) */
  defaultPosition?: { x: number; y: number };
}

/**
 * Inline style object applied to the draggable container when repositioned.
 */
interface DragStyle {
  top: string;
  left: string;
  right: string;
  bottom: string;
  animation: string;
}

/**
 * Return type for the useDraggable hook.
 */
interface UseDraggableReturn {
  /** Ref to attach to the draggable container element */
  containerRef: RefObject<HTMLDivElement>;
  /** Callback ref to attach to the drag handle element */
  handleRef: Ref<HTMLDivElement>;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Inline style to apply to the container, or undefined if not yet dragged */
  dragStyle: DragStyle | undefined;
}

/**
 * Clamps a position so the element stays within the viewport.
 * @param x - Desired left position
 * @param y - Desired top position
 * @param width - Element width
 * @param height - Element height
 * @returns Clamped { x, y } coordinates
 */
function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  const padding = 8;
  const maxX = window.innerWidth - width - padding;
  const maxY = window.innerHeight - height - padding;

  return {
    x: Math.max(padding, Math.min(x, maxX)),
    y: Math.max(padding, Math.min(y, maxY)),
  };
}

/**
 * Hook that enables drag-to-reposition on a fixed-position element.
 * Uses window-level pointer event listeners for reliable tracking across
 * all DOM contexts including Shadow DOM.
 *
 * @param options - Configuration options
 * @returns Refs, state, and style to wire up dragging
 *
 * @example
 * ```tsx
 * const { containerRef, handleRef, isDragging, dragStyle } = useDraggable();
 * return (
 *   <div ref={containerRef} style={dragStyle}>
 *     <div ref={handleRef}>Drag me</div>
 *   </div>
 * );
 * ```
 */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const { disabled = false, suppressRef, defaultPosition } = options;

  const containerRef = useRef<HTMLDivElement>(null);

  // Callback ref for the drag handle — sets state when the element mounts/unmounts
  // so the useEffect that attaches listeners re-runs at the right time.
  const handleElRef = useRef<HTMLDivElement | null>(null);
  const [handleEl, setHandleEl] = useState<HTMLDivElement | null>(null);
  const handleRef = useCallback((el: HTMLDivElement | null) => {
    handleElRef.current = el;
    setHandleEl(el);
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mutable refs to avoid stale closures in pointer event handlers
  const isDraggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  // Reset position when disabled changes to true
  useEffect(() => {
    if (disabled) {
      setHasDragged(false);
      setIsDragging(false);
      isDraggingRef.current = false;
      clearPanelPosition();
    }
  }, [disabled]);

  // Restore saved position on mount (or use defaultPosition for PiP)
  useEffect(() => {
    if (disabled) return;
    const saved = getPanelPosition();
    if (saved) {
      setPosition(saved);
      positionRef.current = saved;
      setHasDragged(true);
    } else if (defaultPosition) {
      setPosition(defaultPosition);
      positionRef.current = defaultPosition;
      setHasDragged(true);
    }
  }, [disabled, defaultPosition]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newX = e.clientX - offsetRef.current.x;
      const newY = e.clientY - offsetRef.current.y;

      const clamped = clampToViewport(newX, newY, rect.width, rect.height);
      positionRef.current = clamped;
      setPosition(clamped);
      setHasDragged(true);
    },
    []
  );

  const onPointerUp = useCallback(
    () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);
      savePanelPosition(positionRef.current);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    },
    [onPointerMove]
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (disabled) return;
      if (e.button !== 0) return; // Only primary button
      if (suppressRef?.current) return; // Suppress during pinch

      const container = containerRef.current;
      if (!container) return;

      // Prevent native text selection / drag-and-drop so pointermove keeps firing
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      isDraggingRef.current = true;
      setIsDragging(true);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [disabled, suppressRef, onPointerMove, onPointerUp]
  );

  // Attach pointerdown and dragstart listeners on the handle.
  // Depends on handleEl (state set by callback ref) so it re-runs when the
  // handle element mounts — critical because VideoCall renders conditionally.
  useEffect(() => {
    if (!handleEl || disabled) return;

    /** Blocks native HTML5 drag on text/images inside the handle. */
    const onDragStart = (e: Event) => e.preventDefault();

    handleEl.addEventListener('pointerdown', onPointerDown);
    handleEl.addEventListener('dragstart', onDragStart);

    return () => {
      handleEl.removeEventListener('pointerdown', onPointerDown);
      handleEl.removeEventListener('dragstart', onDragStart);
      // Clean up any lingering window listeners if unmounting mid-drag
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [handleEl, disabled, onPointerDown, onPointerMove, onPointerUp]);

  const dragStyle: DragStyle | undefined = hasDragged
    ? {
        top: `${position.y}px`,
        left: `${position.x}px`,
        right: 'auto',
        bottom: 'auto',
        animation: 'none',
      }
    : undefined;

  return { containerRef, handleRef, isDragging, dragStyle };
}
