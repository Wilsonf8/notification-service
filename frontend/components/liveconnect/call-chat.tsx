/**
 * In-call chat component for video calls.
 * Shows message history and allows sending messages during a call.
 * Uses LiveKit data channels for instant delivery and REST API for persistence.
 * @module components/liveconnect/call-chat
 */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconSend,
  IconX,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth";
import type { Room } from "livekit-client";
import type { LiveConnectMessage } from "@/lib/types";

/** Backend API base URL */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

/**
 * Derives WebSocket URL from API URL.
 */
function getWebSocketUrl(): string {
  return API_URL.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
}

/** WebSocket URL */
const WS_URL = getWebSocketUrl();

/** Chat message with optional sender name for display */
interface ChatMessageWithSender extends LiveConnectMessage {
  senderName?: string;
}

/** Data channel chat message payload */
interface DataChannelChatPayload {
  id: string;
  content: string;
  senderType: "USER" | "REP";
  senderName: string;
  sentAt: string;
}

/** Props for the CallChat component */
interface CallChatProps {
  conversationId: string;
  projectId?: string;
  authToken: string;
  authType: "session" | "jwt";
  room: Room | null;
  onClose: () => void;
}

/**
 * Formats time for message display.
 */
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * In-call chat component.
 * Fetches and displays messages, allows sending new messages.
 */
export function CallChat({
  conversationId,
  projectId,
  authToken,
  authType,
  room,
  onClose,
}: CallChatProps) {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const receivedMessageIds = useRef(new Set<string>());

  /**
   * Scrolls to the bottom of the message list.
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /**
   * Fetches messages from the API.
   */
  const fetchMessages = useCallback(async () => {
    try {
      let url: string;
      let headers: HeadersInit;

      if (authType === "jwt" && projectId) {
        // Rep auth - use dashboard API
        url = `${API_URL}/api/projects/${projectId}/liveconnect/conversations/${conversationId}/messages`;
        headers = {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        };
      } else {
        // Visitor auth - use public API
        url = `${API_URL}/v1/liveconnect/conversations/${conversationId}/messages`;
        headers = {
          "X-Session-Token": authToken,
          "Content-Type": "application/json",
        };
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      // Dashboard returns { messages: [...] }, widget returns flat array
      const messageList: LiveConnectMessage[] = Array.isArray(data) ? data : data.messages;
      // Seed dedup set with existing message IDs
      messageList.forEach((msg: LiveConnectMessage) => receivedMessageIds.current.add(msg.id));
      setMessages(messageList);
      setError(null);
    } catch (err) {
      console.error("[CallChat] Failed to fetch messages:", err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [conversationId, projectId, authToken, authType]);

  /**
   * Sends a new message via dual-path: data channel (instant) + REST API (persistence).
   */
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    const messageId = crypto.randomUUID();
    const sentAt = new Date().toISOString();
    const senderType = authType === "jwt" ? "REP" : "USER";

    // Mark as seen for dedup and show optimistically
    receivedMessageIds.current.add(messageId);
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        conversationId,
        senderType: senderType as "USER" | "REP" | "SYSTEM",
        senderId: null,
        content,
        createdAt: sentAt,
      },
    ]);
    setNewMessage("");

    try {
      setSending(true);
      setError(null);

      // Instant path: send via data channel
      if (room) {
        try {
          const payload: DataChannelChatPayload = {
            id: messageId,
            content,
            senderType,
            senderName: senderType === "REP" ? "Rep" : "Visitor",
            sentAt,
          };
          await room.localParticipant.sendText(JSON.stringify(payload), {
            topic: "lc-chat",
          });
        } catch (err) {
          console.error("[CallChat] Failed to send via data channel:", err);
        }
      }

      // Persistence path: send via REST API
      let url: string;
      let headers: HeadersInit;

      if (authType === "jwt" && projectId) {
        url = `${API_URL}/api/projects/${projectId}/liveconnect/conversations/${conversationId}/messages`;
        headers = {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        };
      } else {
        url = `${API_URL}/v1/liveconnect/conversations/${conversationId}/messages`;
        headers = {
          "X-Session-Token": authToken,
          "Content-Type": "application/json",
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, messageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
    } catch (err) {
      console.error("[CallChat] Failed to send message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  /**
   * Handles Enter key press to send message.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Initial fetch for message history
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Register data channel text stream handler for instant messages
  useEffect(() => {
    if (!room) return;

    const topic = "lc-chat";

    room.registerTextStreamHandler(topic, async (reader) => {
      try {
        const text = await reader.readAll();
        const payload: DataChannelChatPayload = JSON.parse(text);

        // Deduplicate
        if (receivedMessageIds.current.has(payload.id)) {
          return;
        }
        receivedMessageIds.current.add(payload.id);

        setMessages((prev) => [
          ...prev,
          {
            id: payload.id,
            conversationId,
            senderType: payload.senderType as "USER" | "REP" | "SYSTEM",
            senderId: null,
            senderName: payload.senderName,
            content: payload.content,
            createdAt: payload.sentAt,
          },
        ]);
      } catch (err) {
        console.error("[CallChat] Failed to parse data channel message:", err);
      }
    });

    return () => {
      try {
        room.unregisterTextStreamHandler(topic);
      } catch {
        // Ignore if not registered
      }
    };
  }, [room, conversationId]);

  // WebSocket fallback for rep side — delivers messages if data channel misses them
  useEffect(() => {
    if (authType !== "jwt" || !projectId) return;

    let ws: WebSocket | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const connect = async () => {
      try {
        const token = await getToken();
        if (!token || !isMounted) return;

        ws = new WebSocket(
          `${WS_URL}/api/projects/${projectId}/liveconnect/ws?token=${encodeURIComponent(token)}`
        );

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "pong") return;
            if (data.type !== "message_received") return;
            if (data.conversationId !== conversationId) return;

            // Deduplicate against data channel and optimistic messages
            if (receivedMessageIds.current.has(data.messageId)) return;
            receivedMessageIds.current.add(data.messageId);

            setMessages((prev) => [
              ...prev,
              {
                id: data.messageId,
                conversationId,
                senderType: data.senderType as "USER" | "REP" | "SYSTEM",
                senderId: null,
                senderName: data.senderName,
                content: data.content,
                createdAt: data.sentAt,
              },
            ]);
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onopen = () => {
          heartbeatInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 15000);
        };

        ws.onclose = () => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
      } catch {
        // Ignore connection errors — data channel is primary
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [authType, projectId, conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Chat</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={fetchMessages}
            disabled={loading}
          >
            <IconRefresh className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <IconX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-0.5",
                  message.senderType === "REP"
                    ? "items-end"
                    : message.senderType === "SYSTEM"
                    ? "items-center"
                    : "items-start"
                )}
              >
                {message.senderType === "SYSTEM" ? (
                  <p className="text-xs italic text-muted-foreground">
                    {message.content}
                  </p>
                ) : (
                  <>
                    {message.senderName && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {message.senderName}
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] px-2.5 py-1.5 text-sm",
                        message.senderType === "REP"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(message.createdAt)}
                    </span>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-destructive bg-destructive/10 px-3 py-1">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-2">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="h-8 text-sm"
            disabled={sending}
          />
          <Button
            size="icon-sm"
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconSend className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
