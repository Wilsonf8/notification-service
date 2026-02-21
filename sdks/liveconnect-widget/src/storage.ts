/**
 * LiveConnect Widget Storage.
 * Provides localStorage persistence for visitor ID, session token, and active call state.
 * Handles SSR and private browsing mode gracefully.
 */

// ============================================================================
// Storage Key Constants
// ============================================================================

/** Storage key for the unique visitor ID (persisted across sessions) */
export const STORAGE_KEY_VISITOR_ID = 'lc_visitor_id';

/** Storage key for the session token from /init response */
export const STORAGE_KEY_SESSION_TOKEN = 'lc_session_token';

/** Storage key for active call state (for reconnection on page navigation) */
export const STORAGE_KEY_ACTIVE_CALL = 'lc_active_call';

/** Storage key for draggable panel position (persisted per tab via sessionStorage) */
export const STORAGE_KEY_PANEL_POSITION = 'lc_panel_position';

/** Default max age for active call state (60 seconds) */
const DEFAULT_CALL_MAX_AGE_MS = 60_000;

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Active call state for reconnection across page navigations.
 */
export interface ActiveCallState {
  /** The conversation ID for the active call */
  conversationId: string;
  /** The LiveKit room name */
  roomName: string;
  /** The session token for authentication */
  sessionToken: string;
  /** Timestamp when the state was saved (milliseconds since epoch) */
  timestamp: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if localStorage is available.
 * Handles SSR, private browsing, and other edge cases.
 * @returns True if localStorage is available and functional
 */
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    // Test that localStorage actually works (some browsers allow the object but throw on use)
    const testKey = '__lc_storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely gets an item from localStorage.
 * @param key - The storage key
 * @returns The stored value or null if not found or unavailable
 */
function safeGetItem(key: string): string | null {
  try {
    if (!isLocalStorageAvailable()) {
      return null;
    }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely sets an item in localStorage.
 * @param key - The storage key
 * @param value - The value to store
 * @returns True if the operation succeeded
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    if (!isLocalStorageAvailable()) {
      return false;
    }
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely removes an item from localStorage.
 * @param key - The storage key
 * @returns True if the operation succeeded
 */
function safeRemoveItem(key: string): boolean {
  try {
    if (!isLocalStorageAvailable()) {
      return false;
    }
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if sessionStorage is available.
 * Handles SSR, private browsing, and other edge cases.
 * @returns True if sessionStorage is available and functional
 */
function isSessionStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }
    const testKey = '__lc_session_storage_test__';
    window.sessionStorage.setItem(testKey, 'test');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely gets an item from sessionStorage.
 * @param key - The storage key
 * @returns The stored value or null if not found or unavailable
 */
function safeSessionGetItem(key: string): string | null {
  try {
    if (!isSessionStorageAvailable()) {
      return null;
    }
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely sets an item in sessionStorage.
 * @param key - The storage key
 * @param value - The value to store
 * @returns True if the operation succeeded
 */
function safeSessionSetItem(key: string, value: string): boolean {
  try {
    if (!isSessionStorageAvailable()) {
      return false;
    }
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely removes an item from sessionStorage.
 * @param key - The storage key
 * @returns True if the operation succeeded
 */
function safeSessionRemoveItem(key: string): boolean {
  try {
    if (!isSessionStorageAvailable()) {
      return false;
    }
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a UUID v4.
 * Uses crypto.randomUUID if available, otherwise falls back to a manual implementation.
 * @returns A new UUID string
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback implementation using crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant (RFC 4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122

    // Convert to hex string with dashes
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Last resort fallback using Math.random (less secure but functional)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Visitor ID Management
// ============================================================================

/**
 * Gets the visitor ID, creating and persisting a new one if it doesn't exist.
 * The visitor ID is a UUID that uniquely identifies this browser/device.
 * @returns The visitor ID (existing or newly created)
 */
export function getVisitorId(): string {
  // Try to get existing visitor ID
  const existingId = safeGetItem(STORAGE_KEY_VISITOR_ID);
  if (existingId) {
    return existingId;
  }

  // Generate new visitor ID and persist it
  const newId = generateUUID();
  safeSetItem(STORAGE_KEY_VISITOR_ID, newId);

  return newId;
}

/**
 * Clears the visitor ID from storage.
 * Useful for testing or when the user wants to reset their identity.
 */
export function clearVisitorId(): void {
  safeRemoveItem(STORAGE_KEY_VISITOR_ID);
}

// ============================================================================
// Session Token Management
// ============================================================================

/**
 * Gets the session token from storage.
 * @returns The session token or null if not found
 */
export function getSessionToken(): string | null {
  return safeGetItem(STORAGE_KEY_SESSION_TOKEN);
}

/**
 * Sets the session token in storage.
 * @param token - The session token to store
 * @returns True if the operation succeeded
 */
export function setSessionToken(token: string): boolean {
  return safeSetItem(STORAGE_KEY_SESSION_TOKEN, token);
}

/**
 * Clears the session token from storage.
 */
export function clearSessionToken(): void {
  safeRemoveItem(STORAGE_KEY_SESSION_TOKEN);
}

// ============================================================================
// Active Call State Management
// ============================================================================

/**
 * Saves the active call state for reconnection after page navigation.
 * Automatically adds the current timestamp.
 * @param state - The call state to save (without timestamp)
 * @returns True if the operation succeeded
 */
export function saveActiveCall(
  state: Omit<ActiveCallState, 'timestamp'>
): boolean {
  const fullState: ActiveCallState = {
    ...state,
    timestamp: Date.now(),
  };

  return safeSetItem(STORAGE_KEY_ACTIVE_CALL, JSON.stringify(fullState));
}

/**
 * Gets the active call state if it exists and is not expired.
 * @param maxAgeMs - Maximum age in milliseconds (default: 30 seconds)
 * @returns The active call state or null if not found, invalid, or expired
 */
export function getActiveCall(maxAgeMs: number = DEFAULT_CALL_MAX_AGE_MS): ActiveCallState | null {
  const raw = safeGetItem(STORAGE_KEY_ACTIVE_CALL);
  if (!raw) {
    return null;
  }

  try {
    const state = JSON.parse(raw) as ActiveCallState;

    // Validate required fields
    if (
      typeof state.conversationId !== 'string' ||
      typeof state.roomName !== 'string' ||
      typeof state.sessionToken !== 'string' ||
      typeof state.timestamp !== 'number'
    ) {
      // Invalid state, clear it
      clearActiveCall();
      return null;
    }

    // Check expiration
    if (isActiveCallExpired(maxAgeMs, state)) {
      clearActiveCall();
      return null;
    }

    return state;
  } catch {
    // Invalid JSON, clear it
    clearActiveCall();
    return null;
  }
}

/**
 * Clears the active call state from storage.
 * Should be called when a call ends normally.
 */
export function clearActiveCall(): void {
  safeRemoveItem(STORAGE_KEY_ACTIVE_CALL);
}

/**
 * Checks if the active call state is expired.
 * @param maxAgeMs - Maximum age in milliseconds (default: 30 seconds)
 * @param state - Optional state to check (if not provided, reads from storage)
 * @returns True if the call state is expired or doesn't exist
 */
export function isActiveCallExpired(
  maxAgeMs: number = DEFAULT_CALL_MAX_AGE_MS,
  state?: ActiveCallState | null
): boolean {
  const callState = state ?? getActiveCallRaw();
  if (!callState) {
    return true;
  }

  const age = Date.now() - callState.timestamp;
  return age > maxAgeMs;
}

/**
 * Gets the raw active call state without expiration check.
 * Internal helper for isActiveCallExpired to avoid infinite recursion.
 * @returns The active call state or null if not found or invalid
 */
function getActiveCallRaw(): ActiveCallState | null {
  const raw = safeGetItem(STORAGE_KEY_ACTIVE_CALL);
  if (!raw) {
    return null;
  }

  try {
    const state = JSON.parse(raw) as ActiveCallState;

    // Validate required fields
    if (
      typeof state.conversationId !== 'string' ||
      typeof state.roomName !== 'string' ||
      typeof state.sessionToken !== 'string' ||
      typeof state.timestamp !== 'number'
    ) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

// ============================================================================
// Panel Position Persistence (sessionStorage)
// ============================================================================

/**
 * Saves the draggable panel position to sessionStorage.
 * Scoped to the browser tab so position resets when the tab closes.
 * @param position - The { x, y } coordinates to save
 * @returns True if the operation succeeded
 */
export function savePanelPosition(position: { x: number; y: number }): boolean {
  return safeSessionSetItem(
    STORAGE_KEY_PANEL_POSITION,
    JSON.stringify(position)
  );
}

/**
 * Gets the saved panel position from sessionStorage.
 * Validates that the stored value contains numeric x and y fields.
 * @returns The saved position or null if not found or invalid
 */
export function getPanelPosition(): { x: number; y: number } | null {
  const raw = safeSessionGetItem(STORAGE_KEY_PANEL_POSITION);
  if (!raw) {
    return null;
  }

  try {
    const pos = JSON.parse(raw) as { x: number; y: number };

    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      clearPanelPosition();
      return null;
    }

    return pos;
  } catch {
    clearPanelPosition();
    return null;
  }
}

/**
 * Clears the saved panel position from sessionStorage.
 */
export function clearPanelPosition(): void {
  safeSessionRemoveItem(STORAGE_KEY_PANEL_POSITION);
}
