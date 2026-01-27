/**
 * LiveConnect API Client.
 * HTTP client for /v1/liveconnect/* endpoints with typed request/response handling.
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body for initializing a visitor session.
 */
export interface InitRequest {
  /** Unique identifier for the visitor */
  visitorId: string;
}

/**
 * Request body for getting a LiveKit token.
 */
export interface TokenRequest {
  /** Conversation ID to get token for */
  conversationId: string;
}

/**
 * Request body for submitting a contact form.
 */
export interface ContactRequest {
  /** Visitor's name */
  name: string;
  /** Visitor's email address */
  email: string;
  /** Visitor's phone number (optional) */
  phone?: string;
  /** Message from the visitor */
  message: string;
}

/**
 * Request body for sending a chat message.
 */
export interface SendMessageRequest {
  /** Message content */
  content: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response from the /init endpoint.
 */
export interface InitResponse {
  /** Session token for subsequent API calls */
  sessionToken: string;
  /** Welcome message to display to the visitor */
  welcomeMessage: string;
  /** Widget color theme */
  widgetColor: string;
  /** Widget position on the page */
  widgetPosition: string;
}

/**
 * Response from the /token endpoint.
 */
export interface TokenResponse {
  /** LiveKit room token */
  token: string;
  /** LiveKit room name */
  roomName: string;
  /** LiveKit server URL */
  url: string;
}

/**
 * Response from the /request endpoint.
 */
export interface RequestResponse {
  /** Request ID for tracking the call request */
  requestId: string;
  /** ISO timestamp when the request expires */
  expiresAt: string;
}

/**
 * Response from the /ping/{id}/accept endpoint.
 */
export interface AcceptPingResponse {
  /** Conversation ID for the accepted call */
  conversationId: string;
  /** LiveKit room name */
  roomName: string;
  /** LiveKit room token */
  token: string;
  /** LiveKit server URL */
  liveKitUrl: string;
}

/**
 * Response from the /conversations/{id}/messages endpoint.
 */
export interface SendMessageResponse {
  /** ID of the created message */
  messageId: string;
  /** ISO timestamp when the message was created */
  createdAt: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  /** HTTP status code */
  public readonly status: number;
  /** HTTP status text */
  public readonly statusText: string;
  /** Response body if available */
  public readonly body?: unknown;

  /**
   * Creates an ApiError instance.
   * @param message - Error message
   * @param status - HTTP status code
   * @param statusText - HTTP status text
   * @param body - Response body if available
   */
  constructor(message: string, status: number, statusText: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// ============================================================================
// API Client
// ============================================================================

/**
 * LiveConnect API client for communicating with the backend.
 * Manages session tokens and provides typed methods for all endpoints.
 */
export class ApiClient {
  private readonly apiUrl: string;
  private sessionToken: string | null = null;

  /**
   * Creates a new ApiClient instance.
   * @param apiUrl - Base URL for the API (e.g., "https://api.example.com")
   */
  constructor(apiUrl: string) {
    // Remove trailing slash if present
    this.apiUrl = apiUrl.replace(/\/$/, '');
  }

  /**
   * Gets the current session token.
   * @returns The session token or null if not initialized
   */
  public getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * Sets the session token manually.
   * Useful for restoring a session from storage.
   * @param token - The session token to set
   */
  public setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  /**
   * Checks if the client has a valid session token.
   * @returns True if a session token is set
   */
  public hasSession(): boolean {
    return this.sessionToken !== null;
  }

  /**
   * Makes an HTTP request to the API.
   * @param method - HTTP method
   * @param path - API path (without base URL)
   * @param options - Request options
   * @returns The parsed JSON response
   * @throws ApiError on non-2xx responses
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      expectNoContent?: boolean;
    } = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      ...options.headers,
    };

    // Add Content-Type for requests with body
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        // Ignore JSON parse errors for error responses
      }
      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
        errorBody
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204 || options.expectNoContent) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Initializes a visitor session.
   * This is the first call that should be made - it returns a session token
   * that is automatically stored and used for subsequent requests.
   * @param embedKey - The embed key (lck_xxx) for authentication
   * @param visitorId - Unique identifier for the visitor
   * @returns The init response with session token and widget settings
   * @throws ApiError on failure
   */
  public async init(embedKey: string, visitorId: string): Promise<InitResponse> {
    const response = await this.request<InitResponse>('POST', '/v1/liveconnect/init', {
      body: { visitorId },
      headers: {
        'X-Embed-Key': embedKey,
      },
    });

    // Store the session token for subsequent requests
    this.sessionToken = response.sessionToken;

    return response;
  }

  /**
   * Gets a LiveKit token for a conversation.
   * @param conversationId - The conversation ID
   * @returns Token response with LiveKit credentials
   * @throws ApiError on failure or if no session token
   */
  public async getToken(conversationId: string): Promise<TokenResponse> {
    this.requireSession();

    return this.request<TokenResponse>('POST', '/v1/liveconnect/token', {
      body: { conversationId },
      headers: {
        'X-Session-Token': this.sessionToken!,
      },
    });
  }

  /**
   * Creates a call request.
   * @returns Request response with request ID and expiration
   * @throws ApiError on failure or if no session token
   */
  public async createRequest(): Promise<RequestResponse> {
    this.requireSession();

    return this.request<RequestResponse>('POST', '/v1/liveconnect/request', {
      headers: {
        'X-Session-Token': this.sessionToken!,
      },
    });
  }

  /**
   * Cancels a pending call request.
   * @param requestId - The request ID to cancel
   * @throws ApiError on failure or if no session token
   */
  public async cancelRequest(requestId: string): Promise<void> {
    this.requireSession();

    await this.request<void>('POST', `/v1/liveconnect/request/${encodeURIComponent(requestId)}/cancel`, {
      headers: {
        'X-Session-Token': this.sessionToken!,
      },
      expectNoContent: true,
    });
  }

  /**
   * Accepts a ping (incoming call notification).
   * @param requestId - The request ID to accept
   * @returns Accept response with conversation and LiveKit credentials
   * @throws ApiError on failure or if no session token
   */
  public async acceptPing(requestId: string): Promise<AcceptPingResponse> {
    this.requireSession();

    return this.request<AcceptPingResponse>('POST', `/v1/liveconnect/ping/${encodeURIComponent(requestId)}/accept`, {
      headers: {
        'X-Session-Token': this.sessionToken!,
      },
    });
  }

  /**
   * Declines a ping (incoming call notification).
   * @param requestId - The request ID to decline
   * @throws ApiError on failure or if no session token
   */
  public async declinePing(requestId: string): Promise<void> {
    this.requireSession();

    await this.request<void>('POST', `/v1/liveconnect/ping/${encodeURIComponent(requestId)}/decline`, {
      headers: {
        'X-Session-Token': this.sessionToken!,
      },
      expectNoContent: true,
    });
  }

  /**
   * Submits a contact form.
   * @param data - Contact form data
   * @throws ApiError on failure or if no session token
   */
  public async submitContact(data: ContactRequest): Promise<void> {
    this.requireSession();

    await this.request<void>('POST', '/v1/liveconnect/contact', {
      body: data,
      headers: {
        'X-Session-Token': this.sessionToken!,
      },
    });
  }

  /**
   * Sends a message in a conversation.
   * @param conversationId - The conversation ID
   * @param content - Message content
   * @returns Send message response with message ID and timestamp
   * @throws ApiError on failure or if no session token
   */
  public async sendMessage(conversationId: string, content: string): Promise<SendMessageResponse> {
    this.requireSession();

    return this.request<SendMessageResponse>(
      'POST',
      `/v1/liveconnect/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        body: { content },
        headers: {
          'X-Session-Token': this.sessionToken!,
        },
      }
    );
  }

  /**
   * Ensures a session token is available.
   * @throws Error if no session token is set
   */
  private requireSession(): void {
    if (!this.sessionToken) {
      throw new Error('[LiveConnect] No session token. Call init() first.');
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let apiClientInstance: ApiClient | null = null;

/**
 * Creates or returns the singleton API client instance.
 * @param apiUrl - Base URL for the API (required on first call)
 * @returns The API client instance
 * @throws Error if apiUrl is not provided on first call
 */
export function getApiClient(apiUrl?: string): ApiClient {
  if (!apiClientInstance) {
    if (!apiUrl) {
      throw new Error('[LiveConnect] API URL required to create API client');
    }
    apiClientInstance = new ApiClient(apiUrl);
  }
  return apiClientInstance;
}

/**
 * Creates a new API client instance.
 * Use this instead of getApiClient when you need a fresh instance.
 * @param apiUrl - Base URL for the API
 * @returns A new API client instance
 */
export function createApiClient(apiUrl: string): ApiClient {
  return new ApiClient(apiUrl);
}

/**
 * Resets the singleton API client instance.
 * Useful for testing or re-initialization.
 */
export function resetApiClient(): void {
  apiClientInstance = null;
}
