/**
 * LiveConnect Widget State Machine.
 * Manages widget state transitions and context data using Preact signals.
 */

import { signal, computed } from '@preact/signals';

/**
 * All possible widget states.
 */
export enum WidgetStateType {
  /** Small floating button - default/idle state */
  COLLAPSED = 'COLLAPSED',
  /** Panel with action buttons visible */
  EXPANDED = 'EXPANDED',
  /** Connecting to a rep with countdown timer */
  WAITING = 'WAITING',
  /** Rep is pinging the visitor - popup with Accept/Decline */
  INCOMING_PING = 'INCOMING_PING',
  /** Active video call with controls and chat */
  IN_CALL = 'IN_CALL',
  /** Call has been popped out to another window */
  POPPED_OUT = 'POPPED_OUT',
  /** Contact form for leaving visitor info */
  CONTACT_FORM = 'CONTACT_FORM',
}

/**
 * Context for COLLAPSED state - no additional data needed.
 */
export interface CollapsedContext {
  type: WidgetStateType.COLLAPSED;
}

/**
 * Context for EXPANDED state - no additional data needed.
 */
export interface ExpandedContext {
  type: WidgetStateType.EXPANDED;
}

/**
 * Context for WAITING state - tracks the pending call request.
 */
export interface WaitingContext {
  type: WidgetStateType.WAITING;
  /** ID of the call request */
  requestId: string;
  /** When the request expires (ISO timestamp or epoch ms) */
  expiresAt: number;
}

/**
 * Context for INCOMING_PING state - rep-initiated contact.
 */
export interface IncomingPingContext {
  type: WidgetStateType.INCOMING_PING;
  /** ID of the ping/request */
  requestId: string;
  /** Name of the rep reaching out */
  repName: string;
  /** When the ping expires (epoch ms) */
  expiresAt: number;
}

/**
 * Context for IN_CALL state - active call data.
 */
export interface InCallContext {
  type: WidgetStateType.IN_CALL;
  /** Conversation/call ID */
  conversationId: string;
  /** LiveKit room name */
  roomName: string;
  /** Token for joining the LiveKit room */
  liveKitToken: string;
  /** LiveKit server URL */
  liveKitUrl: string;
}

/**
 * Context for POPPED_OUT state - call is in separate window.
 */
export interface PoppedOutContext {
  type: WidgetStateType.POPPED_OUT;
  /** Conversation ID to track if call is still active */
  conversationId: string;
}

/**
 * Context for CONTACT_FORM state - no additional data needed.
 */
export interface ContactFormContext {
  type: WidgetStateType.CONTACT_FORM;
}

/**
 * Union type of all possible widget states with their context.
 */
export type WidgetState =
  | CollapsedContext
  | ExpandedContext
  | WaitingContext
  | IncomingPingContext
  | InCallContext
  | PoppedOutContext
  | ContactFormContext;

/**
 * Valid state transitions for the widget.
 * Maps source state to allowed target states.
 */
const VALID_TRANSITIONS: Record<WidgetStateType, WidgetStateType[]> = {
  [WidgetStateType.COLLAPSED]: [
    WidgetStateType.EXPANDED,
    WidgetStateType.INCOMING_PING,
  ],
  [WidgetStateType.EXPANDED]: [
    WidgetStateType.COLLAPSED,
    WidgetStateType.WAITING,
    WidgetStateType.CONTACT_FORM,
    WidgetStateType.INCOMING_PING,
  ],
  [WidgetStateType.WAITING]: [
    WidgetStateType.COLLAPSED,
    WidgetStateType.IN_CALL,
  ],
  [WidgetStateType.INCOMING_PING]: [
    WidgetStateType.COLLAPSED,
    WidgetStateType.IN_CALL,
  ],
  [WidgetStateType.IN_CALL]: [
    WidgetStateType.POPPED_OUT,
    WidgetStateType.COLLAPSED,
  ],
  [WidgetStateType.POPPED_OUT]: [
    WidgetStateType.COLLAPSED,
  ],
  [WidgetStateType.CONTACT_FORM]: [
    WidgetStateType.EXPANDED,
  ],
};

/**
 * The main widget state signal.
 * Starts in COLLAPSED state.
 */
export const widgetState = signal<WidgetState>({
  type: WidgetStateType.COLLAPSED,
});

/**
 * Validates if a transition from current state to target state is allowed.
 * @param from - Current state type
 * @param to - Target state type
 * @returns True if transition is valid
 */
function isValidTransition(from: WidgetStateType, to: WidgetStateType): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

/**
 * Attempts to transition to a new state.
 * Validates the transition before applying.
 * @param newState - The new state to transition to
 * @returns True if transition succeeded, false if invalid
 */
function transitionTo(newState: WidgetState): boolean {
  const currentType = widgetState.value.type;
  const targetType = newState.type;

  if (!isValidTransition(currentType, targetType)) {
    console.warn(
      `[LiveConnect State] Invalid transition: ${currentType} -> ${targetType}. ` +
      `Allowed transitions: ${VALID_TRANSITIONS[currentType].join(', ')}`
    );
    return false;
  }

  widgetState.value = newState;
  return true;
}

// ============================================================================
// State Transition Functions
// ============================================================================

/**
 * Collapses the widget to the floating button state.
 * Valid from: EXPANDED, WAITING, INCOMING_PING, IN_CALL, POPPED_OUT
 * @returns True if transition succeeded
 */
export function collapse(): boolean {
  return transitionTo({ type: WidgetStateType.COLLAPSED });
}

/**
 * Expands the widget to show action buttons.
 * Valid from: COLLAPSED, CONTACT_FORM
 * @returns True if transition succeeded
 */
export function expand(): boolean {
  return transitionTo({ type: WidgetStateType.EXPANDED });
}

/**
 * Enters waiting state while connecting to a rep.
 * Valid from: EXPANDED
 * @param requestId - The call request ID
 * @param expiresAt - When the request expires (epoch ms)
 * @returns True if transition succeeded
 */
export function startWaiting(requestId: string, expiresAt: number): boolean {
  return transitionTo({
    type: WidgetStateType.WAITING,
    requestId,
    expiresAt,
  });
}

/**
 * Shows incoming ping from a rep.
 * Valid from: COLLAPSED, EXPANDED
 * @param requestId - The ping request ID
 * @param repName - Name of the rep
 * @param expiresAt - When the ping expires (epoch ms)
 * @returns True if transition succeeded
 */
export function showIncomingPing(requestId: string, repName: string, expiresAt: number): boolean {
  return transitionTo({
    type: WidgetStateType.INCOMING_PING,
    requestId,
    repName,
    expiresAt,
  });
}

/**
 * Enters an active call.
 * Valid from: WAITING, INCOMING_PING
 * @param conversationId - The conversation ID
 * @param roomName - LiveKit room name
 * @param liveKitToken - Token for joining the room
 * @param liveKitUrl - LiveKit server URL
 * @returns True if transition succeeded
 */
export function enterCall(
  conversationId: string,
  roomName: string,
  liveKitToken: string,
  liveKitUrl: string
): boolean {
  return transitionTo({
    type: WidgetStateType.IN_CALL,
    conversationId,
    roomName,
    liveKitToken,
    liveKitUrl,
  });
}

/**
 * Pops out the call to a separate window.
 * Valid from: IN_CALL
 * @param conversationId - The conversation ID to track
 * @returns True if transition succeeded
 */
export function popOutCall(conversationId: string): boolean {
  return transitionTo({
    type: WidgetStateType.POPPED_OUT,
    conversationId,
  });
}

/**
 * Shows the contact form.
 * Valid from: EXPANDED
 * @returns True if transition succeeded
 */
export function showContactForm(): boolean {
  return transitionTo({ type: WidgetStateType.CONTACT_FORM });
}

// ============================================================================
// Helper Getters (Computed Signals)
// ============================================================================

/**
 * True if widget is in COLLAPSED state.
 */
export const isCollapsed = computed(() =>
  widgetState.value.type === WidgetStateType.COLLAPSED
);

/**
 * True if widget is in EXPANDED state.
 */
export const isExpanded = computed(() =>
  widgetState.value.type === WidgetStateType.EXPANDED
);

/**
 * True if widget is in WAITING state.
 */
export const isWaiting = computed(() =>
  widgetState.value.type === WidgetStateType.WAITING
);

/**
 * True if there's an incoming ping from a rep.
 */
export const hasIncomingPing = computed(() =>
  widgetState.value.type === WidgetStateType.INCOMING_PING
);

/**
 * True if currently in an active call.
 */
export const isInCall = computed(() =>
  widgetState.value.type === WidgetStateType.IN_CALL
);

/**
 * True if call is popped out to another window.
 */
export const isPoppedOut = computed(() =>
  widgetState.value.type === WidgetStateType.POPPED_OUT
);

/**
 * True if contact form is visible.
 */
export const isContactFormVisible = computed(() =>
  widgetState.value.type === WidgetStateType.CONTACT_FORM
);

/**
 * True if widget is in any call-related state (IN_CALL or POPPED_OUT).
 */
export const hasActiveCall = computed(() =>
  widgetState.value.type === WidgetStateType.IN_CALL ||
  widgetState.value.type === WidgetStateType.POPPED_OUT
);

/**
 * Gets the current state type.
 */
export const currentStateType = computed(() => widgetState.value.type);

// ============================================================================
// Context Getters (Type-safe access to state-specific data)
// ============================================================================

/**
 * Gets waiting context if in WAITING state.
 * @returns WaitingContext or null if not in WAITING state
 */
export function getWaitingContext(): WaitingContext | null {
  const state = widgetState.value;
  return state.type === WidgetStateType.WAITING ? state : null;
}

/**
 * Gets incoming ping context if in INCOMING_PING state.
 * @returns IncomingPingContext or null if not in INCOMING_PING state
 */
export function getIncomingPingContext(): IncomingPingContext | null {
  const state = widgetState.value;
  return state.type === WidgetStateType.INCOMING_PING ? state : null;
}

/**
 * Gets in-call context if in IN_CALL state.
 * @returns InCallContext or null if not in IN_CALL state
 */
export function getInCallContext(): InCallContext | null {
  const state = widgetState.value;
  return state.type === WidgetStateType.IN_CALL ? state : null;
}

/**
 * Gets popped-out context if in POPPED_OUT state.
 * @returns PoppedOutContext or null if not in POPPED_OUT state
 */
export function getPoppedOutContext(): PoppedOutContext | null {
  const state = widgetState.value;
  return state.type === WidgetStateType.POPPED_OUT ? state : null;
}

// ============================================================================
// Reset Function
// ============================================================================

/**
 * Resets the widget state to the initial COLLAPSED state.
 * Use this when the widget needs a full reset (e.g., on error recovery).
 * Note: This bypasses transition validation for reset scenarios.
 */
export function resetState(): void {
  widgetState.value = { type: WidgetStateType.COLLAPSED };
}
