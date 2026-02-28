/**
 * WebSocket hook for LiveConnect real-time updates.
 * Handles connection, reconnection, heartbeat, and event processing.
 * @module lib/hooks/use-liveconnect-websocket
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getToken } from "@/lib/auth";
import type {
  LiveConnectVisitor,
  LiveConnectRequest,
  LiveConnectMessage,
  ActiveCall,
} from "@/lib/types";

/**
 * Derives WebSocket URL from API URL.
 * Converts https:// to wss:// and http:// to ws://
 */
function getWebSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
  return apiUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
}

/** WebSocket API base URL */
const WS_URL = getWebSocketUrl();

/** Heartbeat interval in milliseconds */
const HEARTBEAT_INTERVAL = 15000;

/** Initial reconnect delay in milliseconds */
const INITIAL_RECONNECT_DELAY = 1000;

/** Maximum reconnect delay in milliseconds */
const MAX_RECONNECT_DELAY = 30000;

/** WebSocket event types from the backend */
type WebSocketEventType =
  | "visitor_joined"
  | "visitor_left"
  | "visitor_updated"
  | "request_received"
  | "request_expired"
  | "request_cancelled"
  | "request_dismissed"
  | "request_accepted_by_other"
  | "message_received"
  | "call_ended"
  | "call_started_broadcast"
  | "call_ended_broadcast"
  | "queue_updated"
  | "rep_availability_changed"
  | "conversation_started"
  | "pong";

/**
 * Base WebSocket event with type field.
 * Backend sends flat events without a nested 'data' wrapper.
 */
interface BaseWebSocketEvent {
  type: WebSocketEventType;
}

/** Visitor joined event from backend */
interface VisitorJoinedEvent extends BaseWebSocketEvent {
  type: "visitor_joined";
  visitorId: string;
  name: string | null;
  email: string | null;
  currentPage: string | null;
  joinedAt: string;
  isFirstVisit?: boolean;
  previousVisitEndedAt?: string | null;
  totalVisitCount?: number;
  countryCode?: string | null;
  country?: string | null;
  city?: string | null;
  browserName?: string | null;
  osName?: string | null;
  deviceType?: string | null;
}

/** Visitor left event from backend */
interface VisitorLeftEvent extends BaseWebSocketEvent {
  type: "visitor_left";
  visitorId: string;
  leftAt: string;
}

/** Visitor updated event from backend */
interface VisitorUpdatedEvent extends BaseWebSocketEvent {
  type: "visitor_updated";
  visitorId: string;
  name: string | null;
  email: string | null;
  currentPage: string | null;
  currentPageTitle: string | null;
  isConnected: boolean | null;
  countryCode?: string | null;
  country?: string | null;
  city?: string | null;
  browserName?: string | null;
  osName?: string | null;
  deviceType?: string | null;
}

/** Request received event from backend */
interface RequestReceivedEvent extends BaseWebSocketEvent {
  type: "request_received";
  requestId: string;
  visitorId: string;
  visitorName: string | null;
  direction: string;
  expiresAt: string;
}

/** Request expired event from backend */
interface RequestExpiredEvent extends BaseWebSocketEvent {
  type: "request_expired";
  requestId: string;
}

/** Request cancelled event from backend */
interface RequestCancelledEvent extends BaseWebSocketEvent {
  type: "request_cancelled";
  requestId: string;
}

/** Request dismissed event from backend (sent only to dismissing rep) */
interface RequestDismissedEvent extends BaseWebSocketEvent {
  type: "request_dismissed";
  requestId: string;
}

/** Request accepted by other rep event from backend */
interface RequestAcceptedByOtherEvent extends BaseWebSocketEvent {
  type: "request_accepted_by_other";
  requestId: string;
  repId: string;
  repName: string;
}

/** Message received event from backend */
interface MessageReceivedWebSocketEvent extends BaseWebSocketEvent {
  type: "message_received";
  messageId: string;
  conversationId: string;
  senderType: string;
  senderId: string | null;
  content: string;
  createdAt: string;
}

/** Call ended event from backend */
interface CallEndedWebSocketEvent extends BaseWebSocketEvent {
  type: "call_ended";
  conversationId: string;
}

/** Queue updated event from backend (full refresh) */
interface QueueUpdatedEvent extends BaseWebSocketEvent {
  type: "queue_updated";
  browsing: LiveConnectVisitor[];
  queue: LiveConnectRequest[];
}

/** Pong event from backend */
interface PongEvent extends BaseWebSocketEvent {
  type: "pong";
}

/** Rep availability changed event from backend */
interface RepAvailabilityChangedEvent extends BaseWebSocketEvent {
  type: "rep_availability_changed";
  hasAvailableReps: boolean;
}

/** Conversation started event from backend */
interface ConversationStartedEvent extends BaseWebSocketEvent {
  type: "conversation_started";
  conversationId: string;
  visitorId: string;
  roomName: string;
  token: string;
  liveKitUrl: string;
  originDeviceSessionId?: string;
  source?: string;
}

/** Call started broadcast event from backend */
interface CallStartedBroadcastEvent extends BaseWebSocketEvent {
  type: "call_started_broadcast";
  conversationId: string;
  visitorId: string;
  visitorName: string | null;
  repId: string;
  repUserId: string;
  repName: string;
  startedAt: string;
}

/** Call ended broadcast event from backend */
interface CallEndedBroadcastEvent extends BaseWebSocketEvent {
  type: "call_ended_broadcast";
  conversationId: string;
}

/** Union of all WebSocket event types */
type WebSocketEvent =
  | VisitorJoinedEvent
  | VisitorLeftEvent
  | VisitorUpdatedEvent
  | RequestReceivedEvent
  | RequestExpiredEvent
  | RequestCancelledEvent
  | RequestDismissedEvent
  | RequestAcceptedByOtherEvent
  | MessageReceivedWebSocketEvent
  | CallEndedWebSocketEvent
  | CallStartedBroadcastEvent
  | CallEndedBroadcastEvent
  | QueueUpdatedEvent
  | PongEvent
  | RepAvailabilityChangedEvent
  | ConversationStartedEvent;

/** Hook return type */
export interface UseLiveConnectWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  sendHeartbeat: () => void;
  reconnect: () => void;
  deviceSessionId: string;
}

/** State setter type for visitors */
type SetVisitors = React.Dispatch<React.SetStateAction<LiveConnectVisitor[]>>;

/** State setter type for requests */
type SetRequests = React.Dispatch<React.SetStateAction<LiveConnectRequest[]>>;

/** State setter type for active calls */
type SetActiveCalls = React.Dispatch<React.SetStateAction<ActiveCall[]>>;

/**
 * Custom hook for managing WebSocket connection to LiveConnect dashboard.
 * Updates visitors, requests, and active calls state via provided setters for real-time updates.
 *
 * @param projectId - The project ID to connect to
 * @param enabled - Whether to enable the WebSocket connection
 * @param setVisitors - State setter for visitors array
 * @param setRequests - State setter for requests array
 * @param setActiveCalls - State setter for active calls array
 * @returns Object containing connection status and control functions
 */
export function useLiveConnectWebSocket(
  projectId: string,
  enabled: boolean = true,
  setVisitors?: SetVisitors,
  setRequests?: SetRequests,
  setActiveCalls?: SetActiveCalls
): UseLiveConnectWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const enabledRef = useRef(enabled);
  const connectRef = useRef<() => void>(() => {});
  const deviceSessionIdRef = useRef(crypto.randomUUID());

  // Keep enabled ref in sync
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /**
   * Sends a heartbeat/ping message to the server.
   */
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
    }
  }, []);

  /**
   * Clears all timers.
   */
  const clearTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handles incoming WebSocket events.
   * Events are flat objects with fields directly on the event (no nested 'data' wrapper).
   */
  const handleEvent = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case "visitor_joined": {
        // Construct visitor from flat event fields
        // Note: event.visitorId is the visitor record ID (not client-side visitorId)
        const visitor: LiveConnectVisitor = {
          id: event.visitorId,
          visitorId: event.visitorId, // Same as id for WebSocket events
          name: event.name,
          email: event.email,
          currentPage: event.currentPage,
          currentPageTitle: null,
          lastSeenAt: event.joinedAt,
          isConnected: true,
          isPingable: true,
          isFirstVisit: event.isFirstVisit ?? true,
          previousVisitEndedAt: event.previousVisitEndedAt ?? null,
          totalVisitCount: event.totalVisitCount ?? 0,
          countryCode: event.countryCode ?? null,
          country: event.country ?? null,
          city: event.city ?? null,
          browserName: event.browserName ?? null,
          osName: event.osName ?? null,
          deviceType: event.deviceType ?? null,
        };
        setVisitors?.((prev) => {
          const existingIndex = prev.findIndex((v) => v.id === event.visitorId);
          if (existingIndex !== -1) {
            // Visitor exists (reconnecting) - update their isConnected status
            return prev.map((v) =>
              v.id === event.visitorId ? { ...v, ...visitor } : v
            );
          }
          // New visitor - add to list
          return [...prev, visitor];
        });
        break;
      }

      case "visitor_left": {
        // event.visitorId is the visitor record ID (not client-side visitorId)
        setVisitors?.((prev) => prev.filter((v) => v.id !== event.visitorId));
        // Also remove any pending requests from this visitor (match iOS behavior)
        setRequests?.((prev) => prev.filter((r) => r.visitorId !== event.visitorId));
        break;
      }

      case "visitor_updated": {
        // event.visitorId is the visitor record ID (not client-side visitorId)
        setVisitors?.((prev) =>
          prev.map((v) =>
            v.id === event.visitorId
              ? {
                  ...v,
                  name: event.name ?? v.name,
                  email: event.email ?? v.email,
                  currentPage: event.currentPage ?? v.currentPage,
                  currentPageTitle: event.currentPageTitle ?? v.currentPageTitle,
                  isConnected: event.isConnected ?? v.isConnected,
                  countryCode: event.countryCode ?? v.countryCode,
                  country: event.country ?? v.country,
                  city: event.city ?? v.city,
                  browserName: event.browserName ?? v.browserName,
                  osName: event.osName ?? v.osName,
                  deviceType: event.deviceType ?? v.deviceType,
                }
              : v
          )
        );
        break;
      }

      case "request_received": {
        // Construct request from flat event fields
        const request: LiveConnectRequest = {
          id: event.requestId,
          visitorId: event.visitorId,
          visitorName: event.visitorName,
          direction: event.direction as LiveConnectRequest["direction"],
          status: "PENDING",
          expiresAt: event.expiresAt,
          createdAt: event.expiresAt, // Use expiresAt as fallback
        };
        setRequests?.((prev) => {
          // Avoid duplicates
          if (prev.some((r) => r.id === event.requestId)) return prev;
          return [...prev, request];
        });
        // Remove visitor from browsing list — they're now in the queue
        setVisitors?.((prev) => prev.filter((v) => v.id !== event.visitorId));
        break;
      }

      case "request_expired": {
        setRequests?.((prev) => prev.filter((r) => r.id !== event.requestId));
        break;
      }

      case "request_cancelled": {
        // Find the request and move visitor back to browsing
        setRequests?.((prev) => {
          const cancelledRequest = prev.find((r) => r.id === event.requestId);
          if (cancelledRequest) {
            const visitor: LiveConnectVisitor = {
              id: cancelledRequest.visitorId,
              visitorId: cancelledRequest.visitorId,
              name: cancelledRequest.visitorName,
              email: null,
              currentPage: null,
              currentPageTitle: null,
              lastSeenAt: new Date().toISOString(),
              isConnected: true,
              isPingable: true,
              isFirstVisit: false,
              previousVisitEndedAt: null,
              totalVisitCount: 0,
              countryCode: null,
              country: null,
              city: null,
              browserName: null,
              osName: null,
              deviceType: null,
            };
            setVisitors?.((prevVisitors) => {
              if (prevVisitors.some((v) => v.id === cancelledRequest.visitorId)) return prevVisitors;
              return [...prevVisitors, visitor];
            });
          }
          return prev.filter((r) => r.id !== event.requestId);
        });
        break;
      }

      case "request_dismissed": {
        // Only removes from this rep's queue — does NOT move visitor to browsing
        // (visitor still has an active request visible to other reps)
        setRequests?.((prev) => prev.filter((r) => r.id !== event.requestId));
        break;
      }

      case "request_accepted_by_other": {
        setRequests?.((prev) => prev.filter((r) => r.id !== event.requestId));
        break;
      }

      case "queue_updated": {
        setVisitors?.(event.browsing);
        setRequests?.(event.queue);
        break;
      }

      case "call_ended": {
        // Could trigger a refresh of conversations if needed
        break;
      }

      case "call_started_broadcast": {
        // Add to active calls
        const callStarted = event as CallStartedBroadcastEvent;
        const newCall: ActiveCall = {
          conversationId: callStarted.conversationId,
          visitorId: callStarted.visitorId,
          visitorName: callStarted.visitorName,
          repId: callStarted.repId,
          repUserId: callStarted.repUserId,
          repName: callStarted.repName,
          startedAt: callStarted.startedAt,
        };
        setActiveCalls?.((prev) => {
          // Avoid duplicates
          if (prev.some((c) => c.conversationId === callStarted.conversationId)) return prev;
          return [...prev, newCall];
        });
        // Remove visitor from browsing list since they're now in a call
        setVisitors?.((prev) => prev.filter((v) => v.id !== callStarted.visitorId));
        // Remove any pending requests for this visitor
        setRequests?.((prev) => prev.filter((r) => r.visitorId !== callStarted.visitorId));
        break;
      }

      case "call_ended_broadcast": {
        // Remove from active calls
        const callEnded = event as CallEndedBroadcastEvent;
        setActiveCalls?.((prev) => prev.filter((c) => c.conversationId !== callEnded.conversationId));
        break;
      }

      case "message_received": {
        // Could be handled by a separate message handler if needed
        break;
      }

      case "pong":
        // Heartbeat acknowledged
        break;

      case "conversation_started": {
        const startedEvent = event as ConversationStartedEvent;
        if (startedEvent.source === "accept") {
          // Rep accepted a visitor's request — HTTP response already opened the call on the accepting device.
          // All devices (including the accepting one) should ignore the WS event.
          break;
        }
        if (startedEvent.source === "ping_accepted") {
          // Visitor accepted a rep's ping — only the device that sent the ping should open the call.
          if (startedEvent.originDeviceSessionId !== deviceSessionIdRef.current) {
            break;
          }
        }
        // Open the call: either ping_accepted on the matching device, or no source (legacy/backward compat)
        const callUrl = `/call/${startedEvent.roomName}?token=${encodeURIComponent(startedEvent.token)}&conversation=${startedEvent.conversationId}&project=${projectId}&liveKitUrl=${encodeURIComponent(startedEvent.liveKitUrl)}&visitor=${startedEvent.visitorId}`;
        window.open(callUrl, "_blank", "width=900,height=600");
        break;
      }

      default:
        console.warn("[WS] Unknown event type:", (event as BaseWebSocketEvent).type);
    }
  }, [projectId, setVisitors, setRequests, setActiveCalls]);

  /**
   * Connects to the WebSocket server.
   */
  const connect = useCallback(() => {
    if (!enabledRef.current || !projectId) return;

    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    clearTimers();

    // Build WebSocket URL with token in query param
    const wsUrl = `${WS_URL}/api/projects/${projectId}/liveconnect/ws?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to LiveConnect");
        setIsConnected(true);
        setError(null);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(
          sendHeartbeat,
          HEARTBEAT_INTERVAL
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          handleEvent(data);
        } catch (e) {
          console.error("[WS] Failed to parse message:", e);
        }
      };

      ws.onerror = (event) => {
        console.error("[WS] WebSocket error:", event);
        setError("Connection error");
      };

      ws.onclose = (event) => {
        console.log("[WS] Connection closed:", event.code, event.reason);
        setIsConnected(false);
        clearTimers();

        // Reconnect if still enabled and not a clean close
        if (enabledRef.current && event.code !== 1000) {
          const delay = reconnectDelayRef.current;
          console.log(`[WS] Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            // Exponential backoff
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * 2,
              MAX_RECONNECT_DELAY
            );
            connectRef.current();
          }, delay);
        }
      };
    } catch (e) {
      console.error("[WS] Failed to create WebSocket:", e);
      setError("Failed to connect");
    }
  }, [projectId, clearTimers, handleEvent, sendHeartbeat]);

  // Keep connect ref in sync
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  /**
   * Manually reconnects to the WebSocket server.
   */
  const reconnect = useCallback(() => {
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    connectRef.current();
  }, []);

  // Connect on mount and when projectId changes
  useEffect(() => {
    if (enabled) {
      // Use setTimeout to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        connectRef.current();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [projectId, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      enabledRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [clearTimers]);

  // Notify backend on tab close / navigation away via fetch with keepalive
  useEffect(() => {
    const handleBeforeUnload = () => {
      const token = getToken();
      if (!token || !projectId) return;
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
      fetch(`${apiUrl}/api/projects/${projectId}/liveconnect/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [projectId]);

  return {
    isConnected,
    error,
    sendHeartbeat,
    reconnect,
    deviceSessionId: deviceSessionIdRef.current,
  };
}
