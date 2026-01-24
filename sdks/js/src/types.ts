/**
 * NotifyKit SDK TypeScript type definitions.
 * @module notifykit/types
 */

/**
 * Options for configuring a notification.
 */
export interface NotifyOptions {
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
export interface NotifyKitConfig {
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
export interface NotifyResponse {
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
 * Internal state for the NotifyKit client.
 */
export interface NotifyKitState {
  apiKey: string | null;
  baseUrl: string;
  debug: boolean;
  initialized: boolean;
}
