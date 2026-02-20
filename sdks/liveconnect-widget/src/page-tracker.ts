/**
 * Page navigation tracker for LiveConnect Widget.
 * Detects page changes (SPA navigations, hash changes, popstate) and sends
 * them to the backend via WebSocket so reps can see what page a visitor is on.
 */

import type { WebSocketClient } from './websocket';

/**
 * Starts tracking page navigations and sending them via WebSocket.
 * Handles initial page load, SPA navigations (pushState/replaceState),
 * browser back/forward (popstate), and hash-based routing (hashchange).
 * @param ws - The WebSocket client instance to send page changes through
 * @returns Cleanup function that removes all listeners and restores originals
 */
export function startPageTracking(ws: WebSocketClient): () => void {
  let lastSentUrl: string | null = null;

  /**
   * Sends the current page URL and title if the URL has changed.
   */
  const sendCurrentPage = (): void => {
    const url = window.location.href;
    const title = document.title;
    if (url === lastSentUrl) return;
    ws.sendPageChange(url, title);
    lastSentUrl = url;
  };

  // Send current page when WebSocket connects (initial load + reconnects)
  const unsubConnection = ws.on('connection_state_change', (state) => {
    if (state === 'connected') {
      lastSentUrl = null; // Reset so we always send on reconnect
      sendCurrentPage();
    }
  });

  // Wrap history.pushState and history.replaceState for SPA navigation detection
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args);
    sendCurrentPage();
  };

  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    originalReplaceState(...args);
    sendCurrentPage();
  };

  // Browser back/forward navigation
  const onPopState = (): void => sendCurrentPage();
  window.addEventListener('popstate', onPopState);

  // Hash-based routing
  const onHashChange = (): void => sendCurrentPage();
  window.addEventListener('hashchange', onHashChange);

  // Return cleanup function
  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', onPopState);
    window.removeEventListener('hashchange', onHashChange);
    unsubConnection();
  };
}
