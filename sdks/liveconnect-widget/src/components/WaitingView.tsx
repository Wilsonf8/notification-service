/**
 * LiveConnect Widget - WaitingView Component.
 * Displays a waiting state with countdown timer while visitor waits for a rep.
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

/**
 * Props for the WaitingView component.
 */
interface WaitingViewProps {
  /** Epoch timestamp (in milliseconds) when the request expires */
  expiresAt: number;
  /** Handler for cancel button click */
  onCancel: () => void;
  /** Optional callback when timer expires */
  onExpired?: () => void;
}

/**
 * Loader/spinner icon as inline SVG (Tabler icon).
 * @returns SVG element for loading spinner
 */
function LoaderIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-waiting__icon"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

/**
 * Formats seconds into a display string (e.g., "45s" or "1:30").
 * @param seconds - Number of seconds to format
 * @returns Formatted time string
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) {
    return '0s';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculates the percentage of time remaining.
 * @param secondsRemaining - Current seconds remaining
 * @param totalSeconds - Total seconds (estimated initial duration)
 * @returns Percentage of time remaining (0-100)
 */
function calculateProgress(secondsRemaining: number, totalSeconds: number): number {
  if (totalSeconds <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
}

/**
 * WaitingView component for the LiveConnect widget.
 * Shows a loading spinner, countdown timer, and cancel button while
 * the visitor waits for a representative to accept their call request.
 *
 * @param props - Component props
 * @returns WaitingView element
 *
 * @example
 * ```tsx
 * <WaitingView
 *   expiresAt={Date.now() + 60000} // Expires in 60 seconds
 *   onCancel={() => cancelRequest()}
 *   onExpired={() => handleExpired()}
 * />
 * ```
 */
export function WaitingView({
  expiresAt,
  onCancel,
  onExpired,
}: WaitingViewProps): h.JSX.Element {
  // Calculate initial seconds remaining
  const initialSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

  // State for countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);

  // Store total duration for progress calculation
  const [totalDuration] = useState<number>(initialSeconds);

  // Track if expired callback has been fired
  const [hasExpired, setHasExpired] = useState<boolean>(false);

  /**
   * Effect to update countdown every second.
   */
  useEffect(() => {
    // Calculate remaining time on each tick
    const updateCountdown = (): void => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      setSecondsRemaining(remaining);

      // Fire expired callback when time runs out
      if (remaining <= 0 && !hasExpired) {
        setHasExpired(true);
        if (onExpired) {
          onExpired();
        }
      }
    };

    // Update immediately
    updateCountdown();

    // Set up interval to update every second
    const intervalId = setInterval(updateCountdown, 1000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [expiresAt, hasExpired, onExpired]);

  /**
   * Handles cancel button click.
   * @param event - Mouse event
   */
  const handleCancel = (event: MouseEvent): void => {
    event.preventDefault();
    onCancel();
  };

  /**
   * Handles cancel button keyboard events for accessibility.
   * @param event - Keyboard event
   */
  const handleCancelKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCancel();
    }
  };

  // Calculate progress percentage for the progress bar
  const progressPercent = calculateProgress(secondsRemaining, totalDuration);

  return (
    <div class="lc-waiting" role="status" aria-live="polite">
      {/* Loading spinner */}
      <LoaderIcon />

      {/* Title */}
      <h3 class="lc-waiting__title">
        Looking for a representative...
      </h3>

      {/* Message */}
      <p class="lc-waiting__message">
        Please wait while we connect you with the next available representative.
      </p>

      {/* Countdown timer */}
      <div
        class="lc-waiting__timer"
        aria-label={`Request expires in ${formatTimeRemaining(secondsRemaining)}`}
      >
        Expires in {formatTimeRemaining(secondsRemaining)}
      </div>

      {/* Progress bar */}
      <div class="lc-waiting__progress" aria-hidden="true">
        <div
          class="lc-waiting__progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Cancel button */}
      <button
        type="button"
        class="lc-btn lc-btn--secondary"
        onClick={handleCancel}
        onKeyDown={handleCancelKeyDown}
        aria-label="Cancel request"
      >
        Cancel
      </button>

      {/* Screen reader announcement for time updates */}
      <span class="lc-sr-only">
        {secondsRemaining <= 10 && secondsRemaining > 0 && (
          `${secondsRemaining} seconds remaining`
        )}
        {secondsRemaining <= 0 && 'Request has expired'}
      </span>
    </div>
  );
}

export default WaitingView;