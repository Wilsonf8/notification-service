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
  | "request_accepted_by_other"
  | "message_received"
  | "call_ended"
  | "queue_updated"
  | "rep_availability_changed"
  | "pong";

/** WebSocket event payload */
interface WebSocketEvent {
  type: WebSocketEventType;
  data: unknown;
}

/** Visitor joined event data */
interface VisitorJoinedData {
  visitor: LiveConnectVisitor;
}

/** Visitor left event data */
interface VisitorLeftData {
  visitorId: string;
}

/** Visitor updated event data */
interface VisitorUpdatedData {
  visitor: LiveConnectVisitor;
}

/** Request received event data */
interface RequestReceivedData {
  request: LiveConnectRequest;
}

/** Request expired event data */
interface RequestExpiredData {
  requestId: string;
}

/** Request accepted by other rep event data */
interface RequestAcceptedByOtherData {
  requestId: string;
  repId: string;
  repName: string;
}

/** Message received event data (unused but kept for future use) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MessageReceivedData {
  message: LiveConnectMessage;
  conversationId: string;
}

/** Call ended event data (unused but kept for future use) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CallEndedData {
  conversationId: string;
}

/** Queue updated event data (full refresh) */
interface QueueUpdatedData {
  browsing: LiveConnectVisitor[];
  queue: LiveConnectRequest[];
}

/** Hook return type */
export interface UseLiveConnectWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  sendHeartbeat: () => void;
  reconnect: () => void;
}

/** State setter type for visitors */
type SetVisitors = React.Dispatch<React.SetStateAction<LiveConnectVisitor[]>>;

/** State setter type for requests */
type SetRequests = React.Dispatch<React.SetStateAction<LiveConnectRequest[]>>;

/**
 * Custom hook for managing WebSocket connection to LiveConnect dashboard.
 * Updates visitors and requests state via provided setters for real-time updates.
 *
 * @param projectId - The project ID to connect to
 * @param enabled - Whether to enable the WebSocket connection
 * @param setVisitors - State setter for visitors array
 * @param setRequests - State setter for requests array
 * @returns Object containing connection status and control functions
 */
export function useLiveConnectWebSocket(
  projectId: string,
  enabled: boolean = true,
  setVisitors?: SetVisitors,
  setRequests?: SetRequests
): UseLiveConnectWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const enabledRef = useRef(enabled);
  const connectRef = useRef<() => void>(() => {});

  // Keep enabled ref in sync
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /**
   * Sends a heartbeat/ping message to the server.
   */
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
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
   */
  const handleEvent = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case "visitor_joined": {
        const { visitor } = event.data as VisitorJoinedData;
        setVisitors?.((prev) => {
          // Avoid duplicates
          if (prev.some((v) => v.id === visitor.id)) return prev;
          return [...prev, visitor];
        });
        break;
      }

      case "visitor_left": {
        const { visitorId } = event.data as VisitorLeftData;
        setVisitors?.((prev) => prev.filter((v) => v.visitorId !== visitorId));
        break;
      }

      case "visitor_updated": {
        const { visitor } = event.data as VisitorUpdatedData;
        setVisitors?.((prev) =>
          prev.map((v) => (v.id === visitor.id ? visitor : v))
        );
        break;
      }

      case "request_received": {
        const { request } = event.data as RequestReceivedData;
        setRequests?.((prev) => {
          // Avoid duplicates
          if (prev.some((r) => r.id === request.id)) return prev;
          return [...prev, request];
        });
        break;
      }

      case "request_expired": {
        const { requestId } = event.data as RequestExpiredData;
        setRequests?.((prev) => prev.filter((r) => r.id !== requestId));
        break;
      }

      case "request_accepted_by_other": {
        const { requestId } = event.data as RequestAcceptedByOtherData;
        setRequests?.((prev) => prev.filter((r) => r.id !== requestId));
        break;
      }

      case "queue_updated": {
        const { browsing, queue } = event.data as QueueUpdatedData;
        setVisitors?.(browsing);
        setRequests?.(queue);
        break;
      }

      case "call_ended": {
        // Could trigger a refresh of conversations if needed
        break;
      }

      case "message_received": {
        // Could be handled by a separate message handler if needed
        break;
      }

      case "pong":
        // Heartbeat acknowledged
        break;

      default:
        console.warn("[WS] Unknown event type:", event.type);
    }
  }, [setVisitors, setRequests]);

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

  return {
    isConnected,
    error,
    sendHeartbeat,
    reconnect,
  };
}
