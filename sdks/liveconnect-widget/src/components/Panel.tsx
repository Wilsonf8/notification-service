/**
 * LiveConnect Widget - Panel Component.
 * Displays the expanded widget panel with welcome message and action buttons.
 */

import { h } from 'preact';
import type { WidgetPosition } from '../config';

/**
 * Props for the Panel component.
 */
interface PanelProps {
  /** Position of the panel on the screen */
  position: WidgetPosition;
  /** Welcome message to display */
  welcomeMessage: string;
  /** Whether representatives are online/available */
  isOnline: boolean;
  /** Handler for "Request to Talk" button click */
  onRequestCall: () => void;
  /** Handler for "Leave Info" button click */
  onLeaveInfo: () => void;
  /** Handler for close button click */
  onClose: () => void;
}

/**
 * X close icon as inline SVG (Tabler icon).
 * @returns SVG element for close icon
 */
function CloseIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-panel__close-icon"
      width="20"
      height="20"
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
 * Video camera icon as inline SVG (Tabler icon).
 * @returns SVG element for video icon
 */
function VideoIcon(): h.JSX.Element {
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
      <path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z" />
      <rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/**
 * Mail/message icon as inline SVG (Tabler icon).
 * @returns SVG element for mail icon
 */
function MailIcon(): h.JSX.Element {
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
      <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" />
      <path d="M3 7l9 6l9 -6" />
    </svg>
  );
}

/**
 * Panel component for the LiveConnect widget.
 * Shows a welcome message and action buttons for video call or leaving info.
 *
 * @param props - Component props
 * @returns Panel element
 *
 * @example
 * ```tsx
 * <Panel
 *   position="bottom-right"
 *   welcomeMessage="How can we help you today?"
 *   isOnline={true}
 *   onRequestCall={() => requestCall()}
 *   onLeaveInfo={() => showForm()}
 *   onClose={() => setExpanded(false)}
 * />
 * ```
 */
export function Panel({
  position,
  welcomeMessage,
  isOnline,
  onRequestCall,
  onLeaveInfo,
  onClose,
}: PanelProps): h.JSX.Element {
  // Build position class based on position prop
  const positionClass = `lc-panel--${position}`;

  /**
   * Handles close button click.
   * @param event - Mouse event
   */
  const handleClose = (event: MouseEvent): void => {
    event.preventDefault();
    onClose();
  };

  /**
   * Handles close button keyboard events for accessibility.
   * @param event - Keyboard event
   */
  const handleCloseKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  };

  /**
   * Handles "Request to Talk" button click.
   * @param event - Mouse event
   */
  const handleRequestCall = (event: MouseEvent): void => {
    event.preventDefault();
    onRequestCall();
  };

  /**
   * Handles "Leave Info" button click.
   * @param event - Mouse event
   */
  const handleLeaveInfo = (event: MouseEvent): void => {
    event.preventDefault();
    onLeaveInfo();
  };

  return (
    <div
      class={`lc-panel ${positionClass}`}
      role="dialog"
      aria-labelledby="lc-panel-title"
      aria-modal="false"
    >
      {/* Header */}
      <div class="lc-panel__header">
        <div>
          <h2 class="lc-panel__title" id="lc-panel-title">
            LiveConnect
          </h2>
          <p class="lc-panel__subtitle">
            {isOnline ? 'We\'re here to help' : 'Currently offline'}
          </p>
        </div>
        <button
          type="button"
          class="lc-panel__close"
          onClick={handleClose}
          onKeyDown={handleCloseKeyDown}
          aria-label="Close panel"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      <div class="lc-panel__content">
        {/* Welcome message */}
        <p class="lc-text lc-mb-lg">
          {welcomeMessage}
        </p>

        {/* Action buttons */}
        <div class="lc-flex lc-flex--col lc-flex--gap-md">
          {/* Request to Talk button - shown when online */}
          {isOnline && (
            <button
              type="button"
              class="lc-btn lc-btn--primary lc-btn--block"
              onClick={handleRequestCall}
            >
              <VideoIcon />
              Request to Talk
            </button>
          )}

          {/* Leave Info button - always shown but emphasized when offline */}
          <button
            type="button"
            class={`lc-btn lc-btn--block ${isOnline ? 'lc-btn--secondary' : 'lc-btn--primary'}`}
            onClick={handleLeaveInfo}
          >
            <MailIcon />
            Leave Your Info
          </button>
        </div>
      </div>
    </div>
  );
}

export default Panel;