/**
 * LiveConnect Widget - Main Container Component.
 * Orchestrates all widget states, manages WebSocket events, and coordinates sub-components.
 */

import { h } from 'preact';
import { useEffect, useState, useCallback } from 'preact/hooks';
import {
  widgetState,
  WidgetStateType,
  collapse,
  expand,
  startWaiting,
  showIncomingPing,
  enterCall,
  popOutCall,
  showContactForm,
  resetState,
} from '../state';
import { getApiClient, type ApiClient } from '../api';
import {
  getWebSocketClient,
  type WebSocketClient,
  type IncomingPingEvent,
  type CallStartingEvent,
  type CallEndedEvent,
  type MessageReceivedEvent,
} from '../websocket';
import { connectToRoom, disconnectFromRoom } from '../livekit';
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
import type { WidgetConfig } from '../config';

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

  /** Welcome message from init response */
  const [welcomeMessage, setWelcomeMessage] = useState<string>('How can we help you today?');

  /** Chat messages for the active conversation */
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  /** Whether the chat panel is visible during a call */
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

  /** Loading state for various operations */
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /** Current pending request ID (for waiting state) */
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  /** Session initialization status */
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  /** Error message for display */
  const [error, setError] = useState<string | null>(null);

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
        setIsOnline(true); // Assume online if init succeeds

        // Initialize WebSocket
        ws = getWebSocketClient(config.apiUrl);
        ws.setSessionToken(initResponse.sessionToken);
        ws.connect();

        // Set up WebSocket event handlers
        setupWebSocketHandlers(ws);

        // Check for active call to reconnect
        const activeCall = getActiveCall();
        if (activeCall) {
          await handleCallReconnect(activeCall.conversationId, activeCall.roomName);
        }

        setIsInitialized(true);
      } catch (err) {
        console.error('[LiveConnect Widget] Initialization error:', err);
        if (isMounted) {
          setError('Failed to initialize widget');
          setIsOnline(false);
        }
      }
    };

    initializeSession();

    // Cleanup on unmount
    return () => {
      isMounted = false;
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

    // Reset chat messages
    setChatMessages([]);

    // Return to collapsed state
    collapse();
  }, []);

  /**
   * Handles message received event.
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

    setChatMessages((prev) => [...prev, newMessage]);
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

    // Reset chat messages
    setChatMessages([]);

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
    setIsChatVisible((prev) => !prev);
  }, []);

  /**
   * Handles send chat message.
   * @param content - Message content to send
   */
  const handleSendMessage = useCallback(async (content: string): Promise<void> => {
    const state = widgetState.value;
    if (state.type !== WidgetStateType.IN_CALL) return;

    try {
      const api = getApiClient();
      const response = await api.sendMessage(state.conversationId, content);

      // Add optimistic message to chat
      const newMessage: ChatMessage = {
        id: response.messageId,
        content,
        senderType: 'VISITOR',
        senderName: 'You',
        sentAt: response.createdAt,
      };

      setChatMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      console.error('[LiveConnect Widget] Failed to send message:', err);
    }
  }, []);

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

      // Enter call state
      enterCall(
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

  // Get current widget state
  const state = widgetState.value;

  // Determine availability status for button
  const availability: AvailabilityStatus = isOnline ? 'online' : 'offline';

  // Get app URL for pop-out (use API URL as base)
  const appUrl = config.apiUrl.replace('/api', '').replace(/\/$/, '');

  // Render based on current state
  switch (state.type) {
    case WidgetStateType.COLLAPSED:
      return (
        <div class="lc-widget">
          <Button
            position={config.position}
            availability={availability}
            onClick={() => expand()}
            disabled={!isInitialized}
          />
        </div>
      );

    case WidgetStateType.EXPANDED:
      return (
        <div class="lc-widget">
          <Button
            position={config.position}
            availability={availability}
            onClick={() => collapse()}
            disabled={!isInitialized}
            ariaLabel="Close panel"
          />
          <Panel
            position={config.position}
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
            position={config.position}
            availability="busy"
            onClick={() => {}}
            disabled={true}
          />
          <div class={`lc-panel lc-panel--${config.position}`}>
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
            position={config.position}
            availability="online"
            onClick={() => {}}
            disabled={true}
          />
          <IncomingPing
            repName={state.repName}
            expiresAt={state.expiresAt}
            onAccept={() => handleAcceptPing(state.requestId)}
            onDecline={() => handleDeclinePing(state.requestId)}
            onExpired={handlePingExpired}
            position={config.position}
          />
        </div>
      );

    case WidgetStateType.IN_CALL:
      return (
        <div class="lc-widget">
          <div class={`lc-panel lc-panel--${config.position}`} style={{ height: '500px' }}>
            <VideoCall
              conversationId={state.conversationId}
              roomName={state.roomName}
              appUrl={appUrl}
              sessionToken={getApiClient().getSessionToken() || ''}
              onEndCall={handleEndCall}
              onPopOut={() => handlePopOut(state.conversationId)}
              onToggleChat={handleToggleChat}
              isChatVisible={isChatVisible}
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
            position={config.position}
            availability="busy"
            onClick={() => collapse()}
          />
          <div class={`lc-panel lc-panel--${config.position}`}>
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
            position={config.position}
            availability={availability}
            onClick={() => expand()}
          />
          <div class={`lc-panel lc-panel--${config.position}`}>
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
            position={config.position}
            availability={availability}
            onClick={() => expand()}
          />
        </div>
      );
  }
}

export default Widget;