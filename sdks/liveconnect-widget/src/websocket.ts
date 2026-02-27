/**
 * LiveConnect WebSocket Client.
 * Manages real-time communication with the backend via WebSocket.
 * Handles auto-reconnect with exponential backoff and heartbeat messages.
 */

// ============================================================================
// Incoming Event Types (Server -> Client)
// ============================================================================

/**
 * Incoming ping event - Rep wants to call visitor.
 */
export interface IncomingPingEvent {
  type: 'incoming_ping';
  /** Unique request identifier */
  requestId: string;
  /** Name of the rep initiating the call */
  repName: string;
  /** ISO timestamp when the ping expires */
  expiresAt: string;
}

/**
 * Call starting event - Call is about to start.
 */
export interface CallStartingEvent {
  type: 'call_starting';
  /** Conversation identifier */
  conversationId: string;
  /** LiveKit room name */
  roomName: string;
  /** LiveKit authentication token */
  token: string;
}

/**
 * Call ended event - Call has ended.
 */
export interface CallEndedEvent {
  type: 'call_ended';
  /** Conversation identifier */
  conversationId: string;
  /** Duration of the call in seconds */
  durationSeconds: number;
}

/**
 * Message received event - New chat message.
 */
export interface MessageReceivedEvent {
  type: 'message_received';
  /** Conversation identifier */
  conversationId: string;
  /** Unique message identifier */
  messageId: string;
  /** Type of sender (REP or VISITOR) */
  senderType: 'REP' | 'VISITOR';
  /** Name of the sender */
  senderName: string;
  /** Message content */
  content: string;
  /** ISO timestamp when the message was sent */
  sentAt: string;
}

/**
 * Connected acknowledgement - Server confirms WebSocket connection.
 */
export interface ConnectedAck {
  type: 'connected';
  sessionId?: string;
}

/**
 * Pong acknowledgement - Server response to ping.
 */
export interface PongAck {
  type: 'pong';
}

/**
 * Request expired event - Visitor's request timed out with no rep accepting.
 */
export interface RequestExpiredEvent {
  type: 'request_expired';
  /** The request ID that expired */
  requestId: string;
}

/**
 * Rep availability changed event - Rep availability status changed for the project.
 */
export interface RepAvailabilityChangedEvent {
  type: 'rep_availability_changed';
  /** Whether any reps are available to take calls */
  repsAvailable: boolean;
}

/**
 * Ping withdrawn event - Rep's pending ping was withdrawn because they entered a call.
 */
export interface PingWithdrawnEvent {
  type: 'ping_withdrawn';
  /** The request ID that was withdrawn */
  requestId: string;
}

/**
 * Union type for all incoming WebSocket events.
 */
export type IncomingEvent =
  | ConnectedAck
  | PongAck
  | IncomingPingEvent
  | CallStartingEvent
  | CallEndedEvent
  | MessageReceivedEvent
  | RequestExpiredEvent
  | RepAvailabilityChangedEvent
  | PingWithdrawnEvent;

// ============================================================================
// Outgoing Message Types (Client -> Server)
// ============================================================================

/**
 * Heartbeat message - Keep connection alive.
 */
export interface HeartbeatMessage {
  type: 'heartbeat';
}

/**
 * Page change message - Notify server of page navigation.
 */
export interface PageChangeMessage {
  type: 'page_change';
  /** Current page URL */
  url: string;
  /** Current page title */
  title: string;
}

/**
 * Union type for all outgoing WebSocket messages.
 */
export type OutgoingMessage = HeartbeatMessage | PageChangeMessage;

// ============================================================================
// Connection State
// ============================================================================

/**
 * WebSocket connection states.
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

// ============================================================================
// Event Listener Types
// ============================================================================

/**
 * Map of event types to their handler signatures.
 */
export interface WebSocketEventMap {
  incoming_ping: (event: IncomingPingEvent) => void;
  call_starting: (event: CallStartingEvent) => void;
  call_ended: (event: CallEndedEvent) => void;
  message_received: (event: MessageReceivedEvent) => void;
  request_expired: (event: RequestExpiredEvent) => void;
  rep_availability_changed: (event: RepAvailabilityChangedEvent) => void;
  ping_withdrawn: (event: PingWithdrawnEvent) => void;
  connection_state_change: (state: ConnectionState) => void;
  error: (error: Error) => void;
}

/**
 * Event names for the WebSocket client.
 */
export type WebSocketEventName = keyof WebSocketEventMap;

// ============================================================================
// WebSocket Client
// ============================================================================

/** Default heartbeat interval in milliseconds (30 seconds) */
const HEARTBEAT_INTERVAL_MS = 30000;

/** Minimum reconnect delay in milliseconds */
const MIN_RECONNECT_DELAY_MS = 1000;

/** Maximum reconnect delay in milliseconds */
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * WebSocket client for LiveConnect real-time communication.
 * Manages connection lifecycle, auto-reconnect, and event handling.
 */
export class WebSocketClient {
  private readonly apiHost: string;
  private sessionToken: string | null = null;
  private socket: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private manualDisconnect = false;

  /** Event listeners registry */
  private readonly listeners: Map<WebSocketEventName, Set<(...args: unknown[]) => void>> = new Map();

  /**
   * Creates a new WebSocketClient instance.
   * @param apiHost - The API host (e.g., "api.example.com" or "wss://api.example.com")
   */
  constructor(apiHost: string) {
    // Normalize the host - remove protocol and trailing slash
    this.apiHost = apiHost
      .replace(/^https?:\/\//, '')
      .replace(/^wss?:\/\//, '')
      .replace(/\/$/, '');
  }

  /**
   * Gets the current connection state.
   * @returns The current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Checks if the client is connected.
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Sets the session token for authentication.
   * @param token - The session token
   */
  public setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  /**
   * Gets the current session token.
   * @returns The session token or null
   */
  public getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * Connects to the WebSocket server.
   * @throws Error if no session token is set
   */
  public connect(): void {
    if (!this.sessionToken) {
      throw new Error('[LiveConnect WebSocket] No session token. Call setSessionToken() first.');
    }

    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      console.warn('[LiveConnect WebSocket] Already connected or connecting.');
      return;
    }

    this.manualDisconnect = false;
    this.doConnect();
  }

  /**
   * Disconnects from the WebSocket server.
   * Prevents auto-reconnect until connect() is called again.
   */
  public disconnect(): void {
    console.log('[LiveConnect WebSocket] Manual disconnect requested');
    this.manualDisconnect = true;
    this.cleanup();
    this.setConnectionState('disconnected');
  }

  /**
   * Sends a page change notification to the server.
   * @param url - The current page URL
   * @param title - The current page title
   */
  public sendPageChange(url: string, title: string): void {
    this.send({ type: 'page_change', url, title });
  }

  /**
   * Registers an event listener for a specific event type.
   * @param event - The event name to listen for
   * @param callback - The callback function to invoke
   * @returns Unsubscribe function
   */
  public on<K extends WebSocketEventName>(
    event: K,
    callback: WebSocketEventMap[K]
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const listeners = this.listeners.get(event)!;
    listeners.add(callback as (...args: unknown[]) => void);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Removes an event listener.
   * @param event - The event name
   * @param callback - The callback function to remove
   */
  public off<K extends WebSocketEventName>(
    event: K,
    callback: WebSocketEventMap[K]
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback as (...args: unknown[]) => void);
    }
  }

  /**
   * Removes all listeners for a specific event or all events.
   * @param event - Optional event name. If not provided, removes all listeners.
   */
  public removeAllListeners(event?: WebSocketEventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Internal method to establish the WebSocket connection.
   */
  private doConnect(): void {
    this.setConnectionState('connecting');

    const wsUrl = `wss://${this.apiHost}/v1/liveconnect/ws?token=${encodeURIComponent(this.sessionToken!)}`;
    console.log('[LiveConnect WebSocket] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));

    try {
      this.socket = new WebSocket(wsUrl);
      this.setupSocketHandlers();
    } catch (error) {
      console.error('[LiveConnect WebSocket] Failed to create WebSocket:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      this.scheduleReconnect();
    }
  }

  /**
   * Sets up event handlers for the WebSocket instance.
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('[LiveConnect WebSocket] Connected');
      this.reconnectAttempt = 0;
      this.setConnectionState('connected');
      this.startHeartbeat();
    };

    this.socket.onclose = (event) => {
      console.log('[LiveConnect WebSocket] Disconnected:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
      this.stopHeartbeat();
      this.setConnectionState('disconnected');

      // Auto-reconnect unless manually disconnected
      if (!this.manualDisconnect) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (event) => {
      console.error('[LiveConnect WebSocket] Error:', event);
      this.emit('error', new Error('WebSocket error occurred'));
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handles incoming WebSocket messages.
   * @param data - The raw message data
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as IncomingEvent;

      if (!message || typeof message.type !== 'string') {
        console.warn('[LiveConnect WebSocket] Received invalid message format:', data);
        return;
      }

      // Emit the event to registered listeners
      switch (message.type) {
        case 'connected':
        case 'pong':
          // Server acknowledgements - no action needed
          break;
        case 'incoming_ping':
          this.emit('incoming_ping', message as IncomingPingEvent);
          break;
        case 'call_starting':
          this.emit('call_starting', message as CallStartingEvent);
          break;
        case 'call_ended':
          this.emit('call_ended', message as CallEndedEvent);
          break;
        case 'message_received':
          this.emit('message_received', message as MessageReceivedEvent);
          break;
        case 'request_expired':
          this.emit('request_expired', message as RequestExpiredEvent);
          break;
        case 'rep_availability_changed':
          this.emit('rep_availability_changed', message as RepAvailabilityChangedEvent);
          break;
        case 'ping_withdrawn':
          this.emit('ping_withdrawn', message as PingWithdrawnEvent);
          break;
        default: {
          // Handle unknown message types gracefully
          const unknownMessage = message as { type: string };
          console.warn('[LiveConnect WebSocket] Unknown message type:', unknownMessage.type);
        }
      }
    } catch (error) {
      console.error('[LiveConnect WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Sends a message through the WebSocket.
   * @param message - The message to send
   */
  private send(message: OutgoingMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[LiveConnect WebSocket] Cannot send message - not connected');
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('[LiveConnect WebSocket] Failed to send message:', error);
    }
  }

  /**
   * Starts the heartbeat interval.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatIntervalId = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stops the heartbeat interval.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.manualDisconnect) {
      console.log('[LiveConnect WebSocket] Skipping reconnect (manual disconnect)');
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      MIN_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_DELAY_MS
    );

    console.log(`[LiveConnect WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempt++;
      this.doConnect();
    }, delay);
  }

  /**
   * Cleans up resources (socket, timers).
   */
  private cleanup(): void {
    // Stop heartbeat
    this.stopHeartbeat();

    // Cancel pending reconnect
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Close socket
    if (this.socket) {
      // Remove handlers to prevent reconnect on manual close
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;

      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close(1000, 'Client disconnect');
      }

      this.socket = null;
    }

    // Reset reconnect counter
    this.reconnectAttempt = 0;
  }

  /**
   * Updates the connection state and emits change event.
   * @param state - The new connection state
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection_state_change', state);
    }
  }

  /**
   * Emits an event to all registered listeners.
   * @param event - The event name
   * @param args - The event arguments
   */
  private emit<K extends WebSocketEventName>(
    event: K,
    ...args: Parameters<WebSocketEventMap[K]>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[LiveConnect WebSocket] Error in ${event} listener:`, error);
        }
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let wsClientInstance: WebSocketClient | null = null;

/**
 * Creates or returns the singleton WebSocket client instance.
 * @param apiHost - API host (required on first call)
 * @returns The WebSocket client instance
 * @throws Error if apiHost is not provided on first call
 */
export function getWebSocketClient(apiHost?: string): WebSocketClient {
  if (!wsClientInstance) {
    if (!apiHost) {
      throw new Error('[LiveConnect WebSocket] API host required to create WebSocket client');
    }
    wsClientInstance = new WebSocketClient(apiHost);
  }
  return wsClientInstance;
}

/**
 * Creates a new WebSocket client instance.
 * Use this instead of getWebSocketClient when you need a fresh instance.
 * @param apiHost - API host
 * @returns A new WebSocket client instance
 */
export function createWebSocketClient(apiHost: string): WebSocketClient {
  return new WebSocketClient(apiHost);
}

/**
 * Resets the singleton WebSocket client instance.
 * Disconnects any existing connection before resetting.
 * Useful for testing or re-initialization.
 */
export function resetWebSocketClient(): void {
  if (wsClientInstance) {
    wsClientInstance.disconnect();
    wsClientInstance = null;
  }
}
