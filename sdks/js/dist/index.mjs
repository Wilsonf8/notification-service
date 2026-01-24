// src/index.ts
var DEFAULT_BASE_URL = "https://notification-service-production-8875.up.railway.app";
var state = {
  apiKey: null,
  baseUrl: DEFAULT_BASE_URL,
  debug: false,
  initialized: false
};
function debugLog(...args) {
  if (state.debug) {
    console.log("[NotifyKit]", ...args);
  }
}
function errorLog(...args) {
  console.error("[NotifyKit]", ...args);
}
var NotifyKit = {
  /**
   * Initializes the NotifyKit SDK with your API key.
   * Call this once at application startup.
   *
   * @param apiKeyOrConfig - Your API key string or full configuration object
   *
   * @example
   * ```typescript
   * // Simple initialization
   * NotifyKit.init('nsk_your_api_key');
   *
   * // With custom options
   * NotifyKit.init({
   *   apiKey: 'nsk_your_api_key',
   *   debug: true,
   * });
   * ```
   */
  init(apiKeyOrConfig) {
    if (typeof apiKeyOrConfig === "string") {
      state.apiKey = apiKeyOrConfig;
      state.baseUrl = DEFAULT_BASE_URL;
      state.debug = false;
    } else {
      state.apiKey = apiKeyOrConfig.apiKey;
      state.baseUrl = apiKeyOrConfig.baseUrl || DEFAULT_BASE_URL;
      state.debug = apiKeyOrConfig.debug || false;
    }
    state.initialized = true;
    debugLog("Initialized with base URL:", state.baseUrl);
  },
  /**
   * Sends a notification asynchronously.
   * This method is fire-and-forget: it won't block your app or throw errors.
   * Errors are logged to the console but won't crash your application.
   *
   * @param message - The notification message to send
   * @param options - Optional configuration for the notification
   * @returns A promise that resolves when the notification is sent (or fails silently)
   *
   * @example
   * ```typescript
   * // Simple notification
   * NotifyKit.notify('Hello world!');
   *
   * // With topic for categorization
   * NotifyKit.notify('New order received', { topic: 'orders' });
   *
   * // With idempotency key to prevent duplicates
   * NotifyKit.notify('Welcome!', {
   *   topic: 'onboarding',
   *   idempotencyKey: `welcome-${userId}`,
   * });
   * ```
   */
  async notify(message, options) {
    if (!state.initialized || !state.apiKey) {
      errorLog(
        "NotifyKit not initialized. Call NotifyKit.init() with your API key first."
      );
      return;
    }
    try {
      debugLog("Sending notification:", message, options);
      const headers = {
        "Content-Type": "application/json",
        "X-API-Key": state.apiKey
      };
      if (options?.idempotencyKey) {
        headers["Idempotency-Key"] = options.idempotencyKey;
      }
      const body = {
        message
      };
      if (options?.topic) {
        body.topic = options.topic;
      }
      const response = await fetch(`${state.baseUrl}/v1/notify`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        errorLog(
          "Failed to send notification:",
          response.status,
          errorData.error || response.statusText
        );
        return;
      }
      const data = await response.json();
      debugLog("Notification sent successfully:", data.eventId);
    } catch (error) {
      errorLog("Failed to send notification:", error);
    }
  },
  /**
   * Checks if the SDK has been initialized.
   * @returns True if init() has been called with an API key
   */
  isInitialized() {
    return state.initialized && state.apiKey !== null;
  },
  /**
   * Resets the SDK state. Useful for testing.
   */
  reset() {
    state.apiKey = null;
    state.baseUrl = DEFAULT_BASE_URL;
    state.debug = false;
    state.initialized = false;
  }
};
var index_default = NotifyKit;
export {
  index_default as default
};
