/**
 * LiveConnect Widget - Main Container Component.
 * Orchestrates all widget states, manages WebSocket events, and coordinates sub-components.
 */

import { h } from 'preact';
import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { useDraggable } from '../hooks/useDraggable';
import {
  widgetState,
  WidgetStateType,
  collapse,
  expand,
  startWaiting,
  showIncomingPing,
  enterCall,
  forceEnterCall,
  popOutCall,
  showContactForm,
  resetState,
} from '../state';
import { getApiClient, ApiError, type ApiClient } from '../api';
import {
  getWebSocketClient,
  type WebSocketClient,
  type IncomingPingEvent,
  type CallStartingEvent,
  type CallEndedEvent,
  type MessageReceivedEvent,
  type RequestExpiredEvent,
  type RepAvailabilityChangedEvent,
} from '../websocket';
import {
  connectToRoom,
  disconnectFromRoom,
  onChatMessage,
  offChatMessage,
  sendChatMessage,
  type DataChannelChatMessage,
} from '../livekit';
import { startPageTracking } from '../page-tracker';
import {
  getVisitorId,
  getSessionToken,
  setSessionToken,
  saveActiveCall,
  clearActiveCall,
  getActiveCall,
} from '../storage';
import { Button, type AvailabilityStatus } from './Button';
import { Panel } from './Panel';
import { WaitingView } from './WaitingView';
import { IncomingPing } from './IncomingPing';
import { VideoCall } from './VideoCall';
import { ChatPanel, type ChatMessage } from './ChatPanel';
import { ContactForm, type ContactFormData } from './ContactForm';
import type { WidgetConfig, WidgetPosition } from '../config';

// Import CSS as string for shadow DOM injection
import widgetStyles from '../styles/widget.css?inline';

/**
 * Props for the Widget component.
 */
interface WidgetProps {
  /** Widget configuration from script tag */
  config: WidgetConfig;
  /** Shadow root for style injection */
  shadowRoot: ShadowRoot;
}

/**
 * Main widget container component.
 * Manages widget state, API interactions, WebSocket events, and renders
 * the appropriate UI based on current state.
 *
 * @param props - Component props
 * @returns Widget element
 */
export function Widget({ config, shadowRoot }: WidgetProps): h.JSX.Element {
  // ============================================================================
  // Local State
  // ============================================================================

  /** Whether representatives are online/available */
  const [isOnline, setIsOnline] = useState<boolean>(false);

  /** Widget position, initialized from script tag, overridden by backend setting */
  const [position, setPosition] = useState<WidgetPosition>(config.position);

  /** Widget icon name from init response */
  const [widgetIcon, setWidgetIcon] = useState<string>('video');

  /** Welcome message from init response */
  const [welcomeMessage, setWelcomeMessage] = useState<string>('How can we help you today?');

  /** Chat messages for the active conversation */
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  /** Whether the chat panel is visible during a call */
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

  /** Whether there are unread chat messages while chat is closed */
  const [hasUnreadChat, setHasUnreadChat] = useState<boolean>(false);

  /** Loading state for various operations */
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /** Current pending request ID (for waiting state) */
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  /** Session initialization status */
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  /** Error message for display */
  const [error, setError] = useState<string | null>(null);

  /** Set of received message IDs for deduplication */
  const receivedMessageIds = useRef(new Set<string>());

  /** Ref tracking chat visibility for use in event handlers (avoids stale closures) */
  const isChatVisibleRef = useRef<boolean>(false);

  /** Whether the organization's subscription is inactive (402 from backend) */
  const [subscriptionInactive, setSubscriptionInactive] = useState<boolean>(false);

  /** Whether the viewport is mobile-sized (disables panel dragging) */
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches
  );

  // Mobile detection via matchMedia listener
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 480px)');
    const onChange = (e: MediaQueryListEvent): void => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Sync chat visibility ref for use in event handler closures
  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;
  }, [isChatVisible]);

  // Draggable panel hook (disabled on mobile where panel is full-width)
  const { containerRef: dragContainerRef, handleRef: dragHandleRef, isDragging, dragStyle } =
    useDraggable({ disabled: isMobile });

  // ============================================================================
  // Data Channel Chat Setup
  // ============================================================================

  /**
   * Normalizes message IDs to ensure case-insensitive deduplication across
   * data channel (client) and WebSocket (server) sources.
   * @param id - Raw message ID string
   * @returns Normalized message ID
   */
  const normalizeMessageId = useCallback((id: string): string => {
    return id.trim().toLowerCase();
  }, []);

  /**
   * Inserts or updates a chat message by ID.
   * Data channel messages insert only; WebSocket messages are authoritative updates.
   * @param incoming - Incoming chat message payload
   * @param options - Upsert options
   * @returns Nothing
   */
  const upsertChatMessage = useCallback(
    (incoming: ChatMessage, options?: { authoritative?: boolean }): void => {
      const normalizedId = normalizeMessageId(incoming.id);

      setChatMessages((prev) => {
        const index = prev.findIndex(
          (message) => normalizeMessageId(message.id) === normalizedId
        );

        if (index === -1) {
          receivedMessageIds.current.add(normalizedId);
          return [...prev, { ...incoming, id: normalizedId }];
        }

        if (!options?.authoritative) {
          return prev;
        }

        const existing = prev[index];
        const next = [...prev];
        next[index] = { ...existing, ...incoming, id: existing.id };
        return next;
      });
    },
    [normalizeMessageId]
  );

  /**
   * Registers the data channel chat handler on mount.
   * Incoming messages are deduplicated against WebSocket messages by ID.
   */
  useEffect(() => {
    onChatMessage((message: DataChannelChatMessage) => {
      const chatMessage: ChatMessage = {
        id: message.id,
        content: message.content,
        senderType: message.senderType === 'USER' ? 'VISITOR' : message.senderType,
        senderName: message.senderName,
        sentAt: message.sentAt,
      };

      // Data channel is instant but non-authoritative; only insert if missing
      upsertChatMessage(chatMessage, { authoritative: false });

      // Track unread messages when chat is closed and sender is not the visitor
      if (!isChatVisibleRef.current && chatMessage.senderType !== 'VISITOR') {
        setHasUnreadChat(true);
      }
    });

    return () => {
      offChatMessage();
    };
  }, [upsertChatMessage]);

  // ============================================================================
  // CSS Injection
  // ============================================================================

  /**
   * Injects widget styles into the shadow DOM on mount.
   */
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = widgetStyles;
    shadowRoot.appendChild(styleElement);

    return () => {
      shadowRoot.removeChild(styleElement);
    };
  }, [shadowRoot]);

  // ============================================================================
  // Theme Application
  // ============================================================================

  /** Font family to CSS font stack mapping */
  const fontStacks: Record<string, string> = {
    'JetBrains Mono': "'JetBrains Mono', monospace",
    'Inter': "'Inter', system-ui, sans-serif",
    'DM Sans': "'DM Sans', sans-serif",
    'Nunito': "'Nunito', sans-serif",
    'System Default': "system-ui, -apple-system, sans-serif",
  };

  /**
   * Applies theme custom properties from the init response to the shadow DOM host.
   * @param initResponse - The init response containing theme settings
   */
  const applyTheme = (initResponse: { widgetColor: string; backgroundColor: string; textColor: string; borderRadius: number; fontFamily: string }): void => {
    const host = shadowRoot.host as HTMLElement;
    if (initResponse.widgetColor) {
      host.style.setProperty('--lc-accent', initResponse.widgetColor);
    }
    if (initResponse.backgroundColor) {
      host.style.setProperty('--lc-bg', initResponse.backgroundColor);
    }
    if (initResponse.textColor) {
      host.style.setProperty('--lc-text', initResponse.textColor);
    }
    if (initResponse.borderRadius !== undefined) {
      host.style.setProperty('--lc-radius', initResponse.borderRadius + 'px');
    }
    if (initResponse.fontFamily) {
      const stack = fontStacks[initResponse.fontFamily] || fontStacks['JetBrains Mono'];
      host.style.setProperty('--lc-font', stack);
    }
  };

  // ============================================================================
  // Session Initialization
  // ============================================================================

  /**
   * Initializes the widget session on mount.
   * Sets up API client, WebSocket, and checks for active calls.
   */
  useEffect(() => {
    let isMounted = true;
    let api: ApiClient;
    let ws: WebSocketClient;
    let stopPageTracking: (() => void) | undefined;

    /**
     * Initializes the session with the backend.
     */
    const initializeSession = async (): Promise<void> => {
      try {
        // Get or create API client
        api = getApiClient(config.apiUrl);

        // Check for existing session token
        const existingToken = getSessionToken();
        if (existingToken) {
          api.setSessionToken(existingToken);
        }

        // Get visitor ID (creates one if not exists)
        const visitorId = getVisitorId();

        // Initialize session with backend
        const initResponse = await api.init(config.embedKey, visitorId);

        if (!isMounted) return;

        // Store session token
        setSessionToken(initResponse.sessionToken);

        // Update local state from init response
        setWelcomeMessage(initResponse.welcomeMessage || 'How can we help you today?');
        setIsOnline(initResponse.repsAvailable);
        if (initResponse.widgetPosition) {
          setPosition(initResponse.widgetPosition as WidgetPosition);
        }
        if (initResponse.widgetIcon) {
          setWidgetIcon(initResponse.widgetIcon);
        }

        // Apply theme custom properties to shadow DOM host
        applyTheme(initResponse);

        // Check for pending request to restore WAITING state across page navigation
        console.log('[LiveConnect Widget] Init response pendingRequest:', initResponse.pendingRequest);
        if (initResponse.pendingRequest) {
          const expiresAt = new Date(initResponse.pendingRequest.expiresAt).getTime();
          const now = Date.now();
          console.log('[LiveConnect Widget] Pending request found:', {
            requestId: initResponse.pendingRequest.requestId,
            expiresAt,
            now,
            isNotExpired: expiresAt > now,
            diff: expiresAt - now,
          });
          if (expiresAt > now) {
            console.log('[LiveConnect Widget] Restoring WAITING state with requestId:', initResponse.pendingRequest.requestId);
            setCurrentRequestId(initResponse.pendingRequest.requestId);
            const transitionResult = startWaiting(initResponse.pendingRequest.requestId, expiresAt);
            console.log('[LiveConnect Widget] startWaiting transition result:', transitionResult);
          } else {
            console.log('[LiveConnect Widget] Pending request expired, not restoring WAITING state');
          }
        } else {
          console.log('[LiveConnect Widget] No pending request in init response');
        }

        // Initialize WebSocket
        ws = getWebSocketClient(config.apiUrl);
        ws.setSessionToken(initResponse.sessionToken);
        ws.connect();

        // Set up WebSocket event handlers
        setupWebSocketHandlers(ws);

        // Track page navigations and send to backend
        stopPageTracking = startPageTracking(ws);

        // Check for active call to reconnect
        const activeCall = getActiveCall();
        if (activeCall) {
          await handleCallReconnect(activeCall.conversationId, activeCall.roomName);
        }

        setIsInitialized(true);
      } catch (err) {
        console.error('[LiveConnect Widget] Initialization error:', err);
        if (isMounted) {
          if (err instanceof ApiError && err.status === 402) {
            setSubscriptionInactive(true);
            return;
          }
          setError('Failed to initialize widget');
          setIsOnline(false);
        }
      }
    };

    initializeSession();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      stopPageTracking?.();
      try {
        const wsClient = getWebSocketClient();
        wsClient.disconnect();
      } catch {
        // Ignore if not initialized
      }
    };
  }, [config.apiUrl, config.embedKey]);

  // ============================================================================
  // WebSocket Event Handlers
  // ============================================================================

  /**
   * Sets up WebSocket event handlers.
   * @param ws - WebSocket client instance
   */
  const setupWebSocketHandlers = (ws: WebSocketClient): void => {
    // Handle incoming ping from rep
    ws.on('incoming_ping', handleIncomingPing);

    // Handle call starting
    ws.on('call_starting', handleCallStarting);

    // Handle call ended
    ws.on('call_ended', handleCallEnded);

    // Handle message received
    ws.on('message_received', handleMessageReceived);

    // Handle request expired (visitor's request timed out)
    ws.on('request_expired', handleRequestExpired);

    // Handle rep availability changes
    ws.on('rep_availability_changed', handleRepAvailabilityChanged);

    // Handle connection state changes
    ws.on('connection_state_change', (state) => {
      if (state === 'disconnected') {
        // Could show reconnecting indicator
      }
    });
  };

  /**
   * Handles incoming ping event from a rep.
   * @param event - Incoming ping event data
   */
  const handleIncomingPing = useCallback((event: IncomingPingEvent): void => {
    const expiresAt = new Date(event.expiresAt).getTime();
    showIncomingPing(event.requestId, event.repName, expiresAt);
  }, []);

  /**
   * Handles call starting event.
   * @param event - Call starting event data
   */
  const handleCallStarting = useCallback(async (event: CallStartingEvent): Promise<void> => {
    try {
      // Get token for the room
      const api = getApiClient();
      const tokenResponse = await api.getToken(event.conversationId);

      // Enter the call state
      enterCall(
        event.conversationId,
        event.roomName,
        tokenResponse.token,
        tokenResponse.url
      );

      // Connect to LiveKit room
      await connectToRoom(tokenResponse.url, tokenResponse.token);

      // Save active call state for reconnection
      saveActiveCall({
        conversationId: event.conversationId,
        roomName: event.roomName,
        sessionToken: api.getSessionToken() || '',
      });
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to start call:', err);
      setError('Failed to connect to call');
      collapse();
    }
  }, []);

  /**
   * Handles call ended event.
   * @param event - Call ended event data
   */
  const handleCallEnded = useCallback((event: CallEndedEvent): void => {
    // Call ended, transition back to collapsed state

    // Disconnect from LiveKit
    disconnectFromRoom();

    // Clear active call state
    clearActiveCall();

    // Reset chat messages and dedup set
    setChatMessages([]);
    receivedMessageIds.current.clear();

    // Return to collapsed state
    collapse();
  }, []);

  /**
   * Handles message received event from WebSocket.
   * Deduplicates against messages already received via data channel.
   * @param event - Message received event data
   */
  const handleMessageReceived = useCallback((event: MessageReceivedEvent): void => {
    const newMessage: ChatMessage = {
      id: event.messageId,
      content: event.content,
      senderType: event.senderType,
      senderName: event.senderName,
      sentAt: event.sentAt,
    };

    // WebSocket is authoritative; update or insert
    upsertChatMessage(newMessage, { authoritative: true });

    // Track unread messages when chat is closed and sender is a rep
    if (!isChatVisibleRef.current && event.senderType === 'REP') {
      setHasUnreadChat(true);
    }
  }, [upsertChatMessage]);

  /**
   * Handles request expired event.
   * Visitor's call request timed out with no rep accepting.
   * @param _event - Request expired event data
   */
  const handleRequestExpired = useCallback((_event: RequestExpiredEvent): void => {
    // Only handle if we're in WAITING state (visitor requested a call)
    const currentState = widgetState.value;
    if (currentState.type === WidgetStateType.WAITING) {
      // Return to collapsed state - visitor can try again
      collapse();
    }
  }, []);

  /**
   * Handles rep availability changed event.
   * Updates the online status based on rep availability.
   * @param event - Rep availability changed event data
   */
  const handleRepAvailabilityChanged = useCallback((event: RepAvailabilityChangedEvent): void => {
    setIsOnline(event.repsAvailable);
  }, []);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  /**
   * Handles request to talk button click.
   * Creates a call request and enters waiting state.
   */
  const handleRequestCall = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const api = getApiClient();
      const response = await api.createRequest();

      // Parse expiration time
      const expiresAt = new Date(response.expiresAt).getTime();

      // Store request ID and enter waiting state
      setCurrentRequestId(response.requestId);
      startWaiting(response.requestId, expiresAt);
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to create request:', err);
      setError('Failed to request call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles cancel waiting button click.
   * Cancels the pending call request.
   */
  const handleCancelWaiting = useCallback(async (): Promise<void> => {
    if (!currentRequestId) {
      collapse();
      return;
    }

    try {
      const api = getApiClient();
      await api.cancelRequest(currentRequestId);
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to cancel request:', err);
    } finally {
      setCurrentRequestId(null);
      collapse();
    }
  }, [currentRequestId]);

  /**
   * Handles waiting timer expiration.
   */
  const handleWaitingExpired = useCallback((): void => {
    setCurrentRequestId(null);
    collapse();
  }, []);

  /**
   * Handles accept ping button click.
   * @param requestId - The ping request ID to accept
   */
  const handleAcceptPing = useCallback(async (requestId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const api = getApiClient();
      const response = await api.acceptPing(requestId);

      // Enter call state
      enterCall(
        response.conversationId,
        response.roomName,
        response.token,
        response.liveKitUrl
      );

      // Connect to LiveKit room
      await connectToRoom(response.liveKitUrl, response.token);

      // Save active call state
      saveActiveCall({
        conversationId: response.conversationId,
        roomName: response.roomName,
        sessionToken: api.getSessionToken() || '',
      });
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to accept ping:', err);
      setError('Failed to accept call. Please try again.');
      collapse();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles decline ping button click.
   * @param requestId - The ping request ID to decline
   */
  const handleDeclinePing = useCallback(async (requestId: string): Promise<void> => {
    try {
      const api = getApiClient();
      await api.declinePing(requestId);
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to decline ping:', err);
    } finally {
      collapse();
    }
  }, []);

  /**
   * Handles ping timer expiration.
   */
  const handlePingExpired = useCallback((): void => {
    collapse();
  }, []);

  /**
   * Handles end call button click.
   */
  const handleEndCall = useCallback(async (): Promise<void> => {
    // Disconnect from LiveKit
    await disconnectFromRoom();

    // Clear active call state
    clearActiveCall();

    // Reset chat messages and dedup set
    setChatMessages([]);
    receivedMessageIds.current.clear();

    // Return to collapsed state
    collapse();
  }, []);

  /**
   * Handles pop out button click.
   * @param conversationId - The conversation ID to pop out
   */
  const handlePopOut = useCallback((conversationId: string): void => {
    popOutCall(conversationId);
  }, []);

  /**
   * Handles chat toggle button click.
   */
  const handleToggleChat = useCallback((): void => {
    setIsChatVisible((prev) => {
      if (!prev) {
        setHasUnreadChat(false);
      }
      return !prev;
    });
  }, []);

  /**
   * Handles send chat message via dual-path: data channel (instant) + REST API (persistence).
   * @param content - Message content to send
   */
  const handleSendMessage = useCallback(async (content: string): Promise<void> => {
    const state = widgetState.value;
    if (state.type !== WidgetStateType.IN_CALL) return;

    // Generate client-side UUID for deduplication
    const messageId = crypto.randomUUID();
    const normalizedMessageId = normalizeMessageId(messageId);
    const sentAt = new Date().toISOString();

    // Add to dedup set and show optimistically
    receivedMessageIds.current.add(normalizedMessageId);
    const optimisticMessage: ChatMessage = {
      id: normalizedMessageId,
      content,
      senderType: 'VISITOR',
      senderName: 'You',
      sentAt,
    };
    setChatMessages((prev) => [...prev, optimisticMessage]);

    // Instant path: send via data channel
    try {
      const dcPayload: DataChannelChatMessage = {
        id: normalizedMessageId,
        content,
        senderType: 'USER',
        senderName: 'Visitor',
        sentAt,
      };
      await sendChatMessage(dcPayload);
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to send via data channel:', err);
    }

    // Persistence path: send via REST API
    try {
      const api = getApiClient();
      await api.sendMessage(state.conversationId, content, normalizedMessageId);
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to persist message:', err);
    }
  }, [normalizeMessageId]);

  /**
   * Handles contact form submission.
   * @param data - Form data to submit
   */
  const handleContactSubmit = useCallback(async (data: ContactFormData): Promise<void> => {
    const api = getApiClient();
    await api.submitContact({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      message: data.message,
    });
  }, []);

  /**
   * Handles contact form cancel.
   */
  const handleContactCancel = useCallback((): void => {
    expand();
  }, []);

  /**
   * Handles call reconnection after page navigation.
   * @param conversationId - The conversation ID to reconnect
   * @param roomName - The room name to reconnect
   */
  const handleCallReconnect = async (conversationId: string, roomName: string): Promise<void> => {
    try {
      const api = getApiClient();
      const tokenResponse = await api.getToken(conversationId);

      // Use forceEnterCall for reconnection (bypasses state validation)
      forceEnterCall(
        conversationId,
        roomName,
        tokenResponse.token,
        tokenResponse.url
      );

      // Connect to LiveKit room
      await connectToRoom(tokenResponse.url, tokenResponse.token);
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to reconnect to call:', err);
      clearActiveCall();
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  // If subscription is inactive, render nothing (widget invisible to end visitors)
  if (subscriptionInactive) {
    return <div />;
  }

  // Get current widget state
  const state = widgetState.value;

  // Determine availability status for button
  const availability: AvailabilityStatus = isOnline ? 'online' : 'offline';

  // Get app URL for pop-out (extracted from script src)
  const appUrl = config.appUrl;

  // Hide widget entirely until initialized to prevent flash of unstyled content
  if (!isInitialized) return null;

  // Render based on current state
  switch (state.type) {
    case WidgetStateType.COLLAPSED:
      return (
        <div class="lc-widget">
          <Button
            position={position}
            availability={availability}
            onClick={() => expand()}
            disabled={!isInitialized}
            icon={widgetIcon}
          />
        </div>
      );

    case WidgetStateType.EXPANDED:
      return (
        <div class="lc-widget">
          <Button
            position={position}
            availability={availability}
            onClick={() => collapse()}
            disabled={!isInitialized}
            ariaLabel="Close panel"
            icon={widgetIcon}
          />
          <Panel
            position={position}
            welcomeMessage={welcomeMessage}
            isOnline={isOnline}
            onRequestCall={handleRequestCall}
            onLeaveInfo={() => showContactForm()}
            onClose={() => collapse()}
          />
        </div>
      );

    case WidgetStateType.WAITING:
      return (
        <div class="lc-widget">
          <Button
            position={position}
            availability="busy"
            onClick={() => {}}
            disabled={true}
            icon={widgetIcon}
          />
          <div class={`lc-panel lc-panel--${position}`}>
            <WaitingView
              expiresAt={state.expiresAt}
              onCancel={handleCancelWaiting}
              onExpired={handleWaitingExpired}
            />
          </div>
        </div>
      );

    case WidgetStateType.INCOMING_PING:
      return (
        <div class="lc-widget">
          <Button
            position={position}
            availability="online"
            onClick={() => {}}
            disabled={true}
            icon={widgetIcon}
          />
          <IncomingPing
            repName={state.repName}
            expiresAt={state.expiresAt}
            onAccept={() => handleAcceptPing(state.requestId)}
            onDecline={() => handleDeclinePing(state.requestId)}
            onExpired={handlePingExpired}
            position={position}
          />
        </div>
      );

    case WidgetStateType.IN_CALL:
      return (
        <div class="lc-widget">
          <div
            ref={dragContainerRef}
            class={`lc-panel lc-panel--${position}${isDragging ? ' lc-panel--dragging' : ''}`}
            style={{ height: '500px', ...dragStyle }}
          >
            <VideoCall
              conversationId={state.conversationId}
              roomName={state.roomName}
              appUrl={appUrl}
              sessionToken={getApiClient().getSessionToken() || ''}
              liveKitUrl={state.liveKitUrl}
              onEndCall={handleEndCall}
              onPopOut={() => handlePopOut(state.conversationId)}
              onToggleChat={handleToggleChat}
              isChatVisible={isChatVisible}
              hasUnreadChat={hasUnreadChat}
              dragHandleRef={dragHandleRef}
            />
            {isChatVisible && (
              <div style={{ height: '250px', borderTop: '1px solid var(--lc-border)' }}>
                <ChatPanel
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                />
              </div>
            )}
          </div>
        </div>
      );

    case WidgetStateType.POPPED_OUT:
      return (
        <div class="lc-widget">
          <Button
            position={position}
            availability="busy"
            onClick={() => collapse()}
            icon={widgetIcon}
          />
          <div class={`lc-panel lc-panel--${position}`}>
            <div class="lc-waiting" style={{ minHeight: '200px' }}>
              <p class="lc-waiting__title">Call in Progress</p>
              <p class="lc-waiting__message">
                Your call is active in another window.
              </p>
              <button
                type="button"
                class="lc-btn lc-btn--secondary"
                onClick={() => collapse()}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );

    case WidgetStateType.CONTACT_FORM:
      return (
        <div class="lc-widget">
          <Button
            position={position}
            availability={availability}
            onClick={() => expand()}
            icon={widgetIcon}
          />
          <div class={`lc-panel lc-panel--${position}`}>
            <div class="lc-panel__content">
              <ContactForm
                onSubmit={handleContactSubmit}
                onCancel={handleContactCancel}
              />
            </div>
          </div>
        </div>
      );

    default:
      // Fallback to collapsed state
      return (
        <div class="lc-widget">
          <Button
            position={position}
            availability={availability}
            onClick={() => expand()}
            icon={widgetIcon}
          />
        </div>
      );
  }
}

export default Widget;
