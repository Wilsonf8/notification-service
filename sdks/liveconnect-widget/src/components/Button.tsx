/**
 * LiveConnect Widget - Floating Action Button (FAB) Component.
 * Displays a circular button with video camera icon and availability indicator.
 */

import { h } from 'preact';
import type { WidgetPosition } from '../config';

/**
 * Availability status for the representative.
 */
export type AvailabilityStatus = 'online' | 'offline' | 'busy';

/**
 * Props for the Button component.
 */
interface ButtonProps {
  /** Position of the button on the screen */
  position: WidgetPosition;
  /** Current availability status of the representative */
  availability: AvailabilityStatus;
  /** Click handler to expand the widget panel */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Accessible label for the button */
  ariaLabel?: string;
}

/**
 * Tabler video camera icon as inline SVG.
 * @returns SVG element for video camera icon
 */
function VideoIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-fab__icon"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z" />
      <rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/**
 * Floating Action Button (FAB) for the LiveConnect widget.
 * Shows a video camera icon with an availability indicator dot.
 *
 * @param props - Component props
 * @returns FAB button element
 *
 * @example
 * ```tsx
 * <Button
 *   position="bottom-right"
 *   availability="online"
 *   onClick={() => setExpanded(true)}
 * />
 * ```
 */
export function Button({
  position,
  availability,
  onClick,
  disabled = false,
  ariaLabel = 'Start video chat',
}: ButtonProps): h.JSX.Element {
  // Build position class based on position prop
  const positionClass = `lc-fab--${position}`;

  // Build availability indicator class
  const indicatorClass = `lc-fab__indicator lc-fab__indicator--${availability}`;

  /**
   * Handles button click events.
   * Prevents click if button is disabled.
   * @param event - Mouse event
   */
  const handleClick = (event: MouseEvent): void => {
    event.preventDefault();
    if (!disabled) {
      onClick();
    }
  };

  /**
   * Handles keyboard events for accessibility.
   * Triggers click on Enter or Space key.
   * @param event - Keyboard event
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      class={`lc-fab ${positionClass}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby="lc-fab-status"
    >
      <VideoIcon />
      <span
        class={indicatorClass}
        role="status"
        id="lc-fab-status"
        aria-label={`Representative is ${availability}`}
      />
      <span class="lc-sr-only">
        {availability === 'online' && 'Representatives available'}
        {availability === 'offline' && 'Representatives offline'}
        {availability === 'busy' && 'Representatives busy'}
      </span>
    </button>
  );
}

export default Button;