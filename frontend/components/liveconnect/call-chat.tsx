/**
 * In-call chat component for video calls.
 * Shows message history and allows sending messages during a call.
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
import type { LiveConnectMessage } from "@/lib/types";

/** Backend API base URL */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

/** Props for the CallChat component */
interface CallChatProps {
  conversationId: string;
  projectId?: string;
  authToken: string;
  authType: "session" | "jwt";
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
  onClose,
}: CallChatProps) {
  const [messages, setMessages] = useState<LiveConnectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setMessages(data);
      setError(null);
    } catch (err) {
      console.error("[CallChat] Failed to fetch messages:", err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [conversationId, projectId, authToken, authType]);

  /**
   * Sends a new message.
   */
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      setError(null);

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

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setNewMessage("");
      // Refresh messages after sending
      await fetchMessages();
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

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();

    // Poll for new messages every 3 seconds
    pollIntervalRef.current = setInterval(fetchMessages, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchMessages]);

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
