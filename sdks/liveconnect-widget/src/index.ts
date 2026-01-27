/**
 * LiveConnect Widget - Embeddable video chat widget.
 * Entry point for the IIFE bundle.
 *
 * Usage:
 * <script src="liveconnect.js" data-key="lck_xxx"></script>
 */

import { h, render } from 'preact';
import { findWidgetScript, parseConfigFromScript, type WidgetConfig } from './config';
import { Widget } from './components/Widget';

/** Widget host element ID */
const WIDGET_HOST_ID = 'liveconnect-widget';

/** Global initialization flag key */
const INIT_FLAG = '__LIVECONNECT_INITIALIZED__';

/** Global config storage key */
const CONFIG_KEY = '__LIVECONNECT_CONFIG__';

// Extend Window interface for global storage
declare global {
  interface Window {
    [INIT_FLAG]?: boolean;
    [CONFIG_KEY]?: WidgetConfig;
  }
}

/**
 * Creates the shadow DOM host element for the widget.
 * @returns The shadow root for rendering the widget
 */
function createWidgetHost(): ShadowRoot {
  const host = document.createElement('div');
  host.id = WIDGET_HOST_ID;

  // Ensure the host doesn't affect page layout but covers full viewport
  host.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;

  document.body.appendChild(host);

  // Create shadow DOM for style isolation
  const shadowRoot = host.attachShadow({ mode: 'open' });

  return shadowRoot;
}

/**
 * Initializes the LiveConnect widget.
 * This function is idempotent - multiple calls will not create multiple widgets.
 */
function initializeWidget(): void {
  // Idempotency check - prevent multiple initializations
  if (window[INIT_FLAG]) {
    console.warn('[LiveConnect] Widget already initialized. Skipping duplicate initialization.');
    return;
  }

  // Find the script tag that loaded this widget
  const scriptElement = findWidgetScript();

  if (!scriptElement) {
    console.error('[LiveConnect] Could not find script tag with data-key attribute.');
    return;
  }

  // Parse configuration from script tag
  let config: WidgetConfig;
  try {
    config = parseConfigFromScript(scriptElement);
  } catch (error) {
    console.error((error as Error).message);
    return;
  }

  // Validate API URL is configured
  if (!config.apiUrl) {
    console.error('[LiveConnect] API URL not configured. Please set VITE_API_URL environment variable.');
    return;
  }

  // Store config globally for access by other modules
  window[CONFIG_KEY] = config;

  // Create shadow DOM container
  const shadowRoot = createWidgetHost();

  // Mark as initialized
  window[INIT_FLAG] = true;

  console.log('[LiveConnect] Widget initialized', {
    embedKey: config.embedKey.substring(0, 8) + '...',
    position: config.position,
  });

  // Render Preact app into shadow DOM
  render(
    h(Widget, { config, shadowRoot }),
    shadowRoot
  );
}

/**
 * Gets the current widget configuration.
 * @returns The widget configuration or undefined if not initialized
 */
export function getConfig(): WidgetConfig | undefined {
  return window[CONFIG_KEY];
}

/**
 * Checks if the widget has been initialized.
 * @returns True if the widget is initialized
 */
export function isInitialized(): boolean {
  return window[INIT_FLAG] === true;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  // DOM already loaded, initialize immediately
  initializeWidget();
}
