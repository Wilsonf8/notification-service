/**
 * NotifyKit SDK TypeScript type definitions.
 * @module notifykit/types
 */
/**
 * Options for configuring a notification.
 */
interface NotifyOptions {
    /**
     * Topic to categorize the notification.
     * Used for filtering and routing notifications.
     */
    topic?: string;
    /**
     * Unique key to prevent duplicate notifications.
     * If a notification with the same idempotency key was already sent,
     * the duplicate will be ignored.
     */
    idempotencyKey?: string;
}
/**
 * Configuration options for initializing NotifyKit.
 */
interface NotifyKitConfig {
    /**
     * Your NotifyKit API key (starts with 'nsk_').
     */
    apiKey: string;
    /**
     * Custom API base URL.
     * Defaults to 'https://api.notifykit.dev'.
     */
    baseUrl?: string;
    /**
     * Enable debug logging.
     * @default false
     */
    debug?: boolean;
}
/**
 * Response from the notify API.
 */
interface NotifyResponse {
    /**
     * Unique identifier for the notification event.
     */
    eventId: string;
    /**
     * Status of the notification request.
     */
    status: "accepted" | "rejected";
    /**
     * Error message if the notification was rejected.
     */
    error?: string;
}

/**
 * NotifyKit SDK for JavaScript.
 * Send notifications from your apps with a simple API.
 * @module notifykit
 */

/**
 * NotifyKit SDK client.
 * Initialize once with your API key, then send notifications from anywhere.
 *
 * @example
 * ```typescript
 * import NotifyKit from 'notifykit';
 *
 * // Initialize once at startup
 * NotifyKit.init('nsk_your_api_key');
 *
 * // Send notifications anywhere in your app
 * NotifyKit.notify('User signed up!');
 * NotifyKit.notify('Payment received', { topic: 'payments' });
 * ```
 */
declare const NotifyKit: {
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
    init(apiKeyOrConfig: string | NotifyKitConfig): void;
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
    notify(message: string, options?: NotifyOptions): Promise<void>;
    /**
     * Checks if the SDK has been initialized.
     * @returns True if init() has been called with an API key
     */
    isInitialized(): boolean;
    /**
     * Resets the SDK state. Useful for testing.
     */
    reset(): void;
};

export { type NotifyKitConfig, type NotifyOptions, type NotifyResponse, NotifyKit as default };
