/**
 * LiveConnect Widget Configuration.
 * Handles parsing configuration from script tag data attributes.
 */

/**
 * Widget position options for placement on the page.
 */
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

/**
 * Configuration interface for the LiveConnect widget.
 */
export interface WidgetConfig {
  /** The embed key from data-key attribute (e.g., "lck_xxx") */
  embedKey: string;
  /** API URL for backend communication */
  apiUrl: string;
  /** Frontend app URL for pop-out functionality */
  appUrl: string;
  /** Widget position on the page */
  position: WidgetPosition;
}

/**
 * API URL from environment variable.
 * Falls back to empty string if not set (will be validated at runtime).
 */
export const API_URL: string = import.meta.env.VITE_API_URL || '';

/**
 * Valid position values for the widget.
 */
const VALID_POSITIONS: WidgetPosition[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

/**
 * Checks if a string is a valid widget position.
 * @param value - The value to check
 * @returns True if the value is a valid WidgetPosition
 */
function isValidPosition(value: string): value is WidgetPosition {
  return VALID_POSITIONS.includes(value as WidgetPosition);
}

/**
 * Extracts the app URL from the script element's src attribute.
 * The script is served from the app (e.g., https://app.notifykit.dev/sdk/liveconnect.js)
 * so we can derive the app base URL from it.
 * @param scriptElement - The script element
 * @returns The app base URL or fallback to current origin
 */
function extractAppUrl(scriptElement: HTMLScriptElement): string {
  const src = scriptElement.src;
  if (src) {
    try {
      const url = new URL(src);
      return `${url.protocol}//${url.host}`;
    } catch {
      // Fall back to current origin if parsing fails
    }
  }
  return window.location.origin;
}

/**
 * Extracts configuration from a script element's data attributes.
 * @param scriptElement - The script element that loaded the widget
 * @returns WidgetConfig parsed from data attributes
 * @throws Error if required data-key attribute is missing
 */
export function parseConfigFromScript(scriptElement: HTMLScriptElement): WidgetConfig {
  const embedKey = scriptElement.getAttribute('data-key');

  if (!embedKey) {
    throw new Error('[LiveConnect] Missing required data-key attribute on script tag');
  }

  const positionAttr = scriptElement.getAttribute('data-position') || 'bottom-right';
  const position: WidgetPosition = isValidPosition(positionAttr) ? positionAttr : 'bottom-right';

  if (positionAttr && !isValidPosition(positionAttr)) {
    console.warn(
      `[LiveConnect] Invalid data-position "${positionAttr}". Using default "bottom-right". ` +
      `Valid options: ${VALID_POSITIONS.join(', ')}`
    );
  }

  return {
    embedKey,
    apiUrl: API_URL,
    appUrl: extractAppUrl(scriptElement),
    position,
  };
}

/**
 * Finds the script element that loaded the LiveConnect widget.
 * Searches for script tags with a data-key attribute.
 * @returns The script element or null if not found
 */
export function findWidgetScript(): HTMLScriptElement | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-key]');

  // Find script with data-key that starts with "lck_" (LiveConnect key prefix)
  for (const script of scripts) {
    const key = script.getAttribute('data-key');
    if (key && key.startsWith('lck_')) {
      return script;
    }
  }

  // Fallback: return first script with data-key if no lck_ prefix found
  return scripts[0] || null;
}
