/**
 * LiveConnect Widget - IncomingPing Component.
 * Displays an attention-grabbing popup when a sales rep pings/calls the visitor.
 * Shows rep name, avatar placeholder, countdown timer, and accept/decline buttons.
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { WidgetPosition } from '../config';

/**
 * Props for the IncomingPing component.
 */
interface IncomingPingProps {
  /** Name of the representative calling */
  repName: string;
  /** Epoch timestamp (in milliseconds) when the ping expires */
  expiresAt: number;
  /** Handler for accept button click */
  onAccept: () => void;
  /** Handler for decline button click */
  onDecline: () => void;
  /** Optional callback when timer expires */
  onExpired?: () => void;
  /** Position of the ping popup on the screen */
  position?: WidgetPosition;
}

/**
 * User avatar placeholder icon as inline SVG (Tabler icon).
 * @returns SVG element for user avatar placeholder
 */
function UserIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-ping__avatar-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

/**
 * Phone/video accept icon as inline SVG (Tabler icon).
 * @returns SVG element for accept/phone icon
 */
function PhoneIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-btn__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" />
    </svg>
  );
}

/**
 * X close/decline icon as inline SVG (Tabler icon).
 * @returns SVG element for decline/close icon
 */
function CloseIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-btn__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
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
 * Extracts initials from a name for avatar display.
 * @param name - Full name to extract initials from
 * @returns Up to 2 character initials (uppercase)
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * IncomingPing component for the LiveConnect widget.
 * Displays an attention-grabbing popup when a sales rep initiates contact.
 * Features:
 * - Rep name and avatar placeholder with initials
 * - Countdown timer until ping expires
 * - Accept (primary) and Decline (secondary) action buttons
 * - Accent border for visual emphasis
 *
 * @param props - Component props
 * @returns IncomingPing element
 *
 * @example
 * ```tsx
 * <IncomingPing
 *   repName="John Smith"
 *   expiresAt={Date.now() + 30000} // Expires in 30 seconds
 *   onAccept={() => acceptCall()}
 *   onDecline={() => declineCall()}
 *   onExpired={() => handleExpired()}
 *   position="bottom-right"
 * />
 * ```
 */
export function IncomingPing({
  repName,
  expiresAt,
  onAccept,
  onDecline,
  onExpired,
  position = 'bottom-right',
}: IncomingPingProps): h.JSX.Element {
  // Calculate initial seconds remaining
  const initialSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

  // State for countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);

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
   * Handles accept button click.
   * @param event - Mouse event
   */
  const handleAccept = (event: MouseEvent): void => {
    event.preventDefault();
    onAccept();
  };

  /**
   * Handles accept button keyboard events for accessibility.
   * @param event - Keyboard event
   */
  const handleAcceptKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAccept();
    }
  };

  /**
   * Handles decline button click.
   * @param event - Mouse event
   */
  const handleDecline = (event: MouseEvent): void => {
    event.preventDefault();
    onDecline();
  };

  /**
   * Handles decline button keyboard events for accessibility.
   * @param event - Keyboard event
   */
  const handleDeclineKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onDecline();
    }
  };

  // Build position class based on position prop
  const positionClass = `lc-ping--${position}`;

  // Get initials for avatar
  const initials = getInitials(repName);

  return (
    <div
      class={`lc-ping ${positionClass}`}
      role="alertdialog"
      aria-labelledby="lc-ping-title"
      aria-describedby="lc-ping-message"
      aria-modal="false"
    >
      {/* Header with avatar and rep info */}
      <div class="lc-ping__header">
        {/* Avatar placeholder with initials */}
        <div class="lc-ping__avatar" aria-hidden="true">
          {initials || <UserIcon />}
        </div>

        {/* Rep info */}
        <div class="lc-ping__info">
          <div class="lc-ping__name" id="lc-ping-title">
            {repName}
          </div>
          <div class="lc-ping__label">
            Incoming Call
          </div>
        </div>
      </div>

      {/* Message */}
      <div class="lc-ping__message" id="lc-ping-message">
        A representative wants to connect with you.
      </div>

      {/* Action buttons */}
      <div class="lc-ping__actions">
        {/* Decline button (secondary) */}
        <button
          type="button"
          class="lc-btn lc-btn--secondary"
          onClick={handleDecline}
          onKeyDown={handleDeclineKeyDown}
          aria-label="Decline call"
          style={{ flex: 1 }}
        >
          <CloseIcon />
          Decline
        </button>

        {/* Accept button (primary/success) */}
        <button
          type="button"
          class="lc-btn lc-btn--success"
          onClick={handleAccept}
          onKeyDown={handleAcceptKeyDown}
          aria-label="Accept call"
          style={{ flex: 1 }}
        >
          <PhoneIcon />
          Accept
        </button>
      </div>

      {/* Countdown timer */}
      <div
        class="lc-ping__timer"
        aria-label={`Call expires in ${formatTimeRemaining(secondsRemaining)}`}
        aria-live="polite"
      >
        Expires in {formatTimeRemaining(secondsRemaining)}
      </div>

      {/* Screen reader announcements */}
      <span class="lc-sr-only">
        {secondsRemaining <= 10 && secondsRemaining > 0 && (
          `${secondsRemaining} seconds remaining to answer`
        )}
        {secondsRemaining <= 0 && 'Call has expired'}
      </span>
    </div>
  );
}

export default IncomingPing;