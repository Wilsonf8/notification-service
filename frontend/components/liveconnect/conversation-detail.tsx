/**
 * Conversation detail component showing messages and call info.
 * @module components/liveconnect/conversation-detail
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconX,
  IconVideo,
  IconMessageCircle,
  IconUser,
  IconClock,
  IconCalendar,
} from "@tabler/icons-react";
import { getConversation, getMessages } from "@/lib/api/liveconnect-dashboard";
import type { LiveConnectConversation, LiveConnectMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Props for the ConversationDetail component */
interface ConversationDetailProps {
  conversationId: string | null;
  projectId: string;
  onClose: () => void;
}

/**
 * Formats call duration in seconds to human readable format.
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "N/A";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Formats date to full readable format.
 */
function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats time only.
 */
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Conversation detail component.
 * Shows detailed information about a conversation including messages.
 */
export function ConversationDetail({
  conversationId,
  projectId,
  onClose,
}: ConversationDetailProps) {
  const [conversation, setConversation] = useState<LiveConnectConversation | null>(null);
  const [messages, setMessages] = useState<LiveConnectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [convData, messagesData] = await Promise.all([
          getConversation(projectId, conversationId),
          getMessages(projectId, conversationId),
        ]);
        setConversation(convData);
        setMessages(messagesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversation");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [conversationId, projectId]);

  if (!conversationId) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <IconMessageCircle className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Select a conversation to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <Skeleton className="h-5 w-32" />
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <IconX className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  if (error || !conversation) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Error</CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <IconX className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || "Conversation not found"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {conversation.type === "VIDEO_CALL" ? (
            <IconVideo className="h-4 w-4 text-primary" />
          ) : (
            <IconMessageCircle className="h-4 w-4 text-muted-foreground" />
          )}
          {conversation.type === "VIDEO_CALL" ? "Video Call" : "Contact Form"}
        </CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <IconX className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversation Info */}
        <div className="space-y-3 border-b pb-4">
          <div className="flex items-center gap-2 text-sm">
            <IconUser className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Visitor:</span>
            <span className="font-medium">{conversation.visitor?.name || "Anonymous"}</span>
          </div>
          {conversation.rep && (
            <div className="flex items-center gap-2 text-sm">
              <IconUser className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Rep:</span>
              <span className="font-medium">{conversation.rep.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Date:</span>
            <span>{formatFullDate(conversation.startedAt)}</span>
          </div>
          {conversation.type === "VIDEO_CALL" && (
            <div className="flex items-center gap-2 text-sm">
              <IconClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span>{formatDuration(conversation.callDurationSeconds)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs font-medium",
                conversation.status === "ACTIVE"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {conversation.status}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div>
          <h4 className="mb-3 text-sm font-medium">Messages</h4>
          {messages.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No messages in this conversation
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-1 p-2",
                    message.senderType === "REP"
                      ? "items-end"
                      : message.senderType === "SYSTEM"
                      ? "items-center"
                      : "items-start"
                  )}
                >
                  {message.senderType === "SYSTEM" ? (
                    <p className="text-xs text-muted-foreground italic">
                      {message.content}
                    </p>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "max-w-[80%] px-3 py-2 text-sm",
                          message.senderType === "REP"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
