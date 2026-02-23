/**
 * Conversations list for a CRM visitor with chat history modal.
 * @module components/liveconnect/crm/visitor-conversations-list
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPhone, IconMessageCircle } from "@tabler/icons-react";
import { getVisitorConversations } from "@/lib/api/liveconnect-crm";
import { getMessages } from "@/lib/api/liveconnect-dashboard";
import type { LiveConnectConversation, LiveConnectMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VisitorConversationsListProps {
  projectId: string;
  visitorId: string;
}

/**
 * Formats seconds into a human-readable duration.
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/**
 * Formats an ISO timestamp into a short time string.
 * @param iso - ISO 8601 date string
 * @returns Formatted time like "2:30 PM"
 */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Displays past conversations for a visitor.
 * Conversations with messages are clickable and open a chat history dialog.
 */
export function VisitorConversationsList({
  projectId,
  visitorId,
}: VisitorConversationsListProps) {
  const [conversations, setConversations] = useState<LiveConnectConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<LiveConnectConversation | null>(null);
  const [messages, setMessages] = useState<LiveConnectMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    getVisitorConversations(projectId, visitorId)
      .then((res) => setConversations(res.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, visitorId]);

  /**
   * Opens the chat history dialog and fetches messages for the conversation.
   * @param conv - The conversation to view
   */
  function handleConversationClick(conv: LiveConnectConversation) {
    if (conv.messageCount <= 0) return;
    setSelectedConversation(conv);
    setMessagesLoading(true);
    getMessages(projectId, conv.id)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }

  /**
   * Closes the dialog and resets message state.
   */
  function handleDialogClose() {
    setSelectedConversation(null);
    setMessages([]);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Past Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const hasMessages = conv.messageCount > 0;
                return (
                  <div
                    key={conv.id}
                    className={cn(
                      "flex items-center justify-between border border-border p-3",
                      hasMessages &&
                        "cursor-pointer hover:bg-muted/50 transition-colors"
                    )}
                    onClick={
                      hasMessages
                        ? () => handleConversationClick(conv)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      {conv.type === "VIDEO_CALL" ? (
                        <IconPhone className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <IconMessageCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm">
                          {conv.type === "VIDEO_CALL"
                            ? "Video Call"
                            : "Contact Form"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.startedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasMessages && (
                        <span className="text-xs text-muted-foreground">
                          {conv.messageCount} msgs
                        </span>
                      )}
                      {conv.callDurationSeconds !== null && (
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(conv.callDurationSeconds)}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {conv.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedConversation !== null}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
      >
        <DialogContent className="max-w-lg">
          {selectedConversation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedConversation.type === "VIDEO_CALL" ? (
                    <IconPhone className="h-4 w-4" />
                  ) : (
                    <IconMessageCircle className="h-4 w-4" />
                  )}
                  {selectedConversation.type === "VIDEO_CALL"
                    ? "Video Call Chat"
                    : "Contact Form Chat"}
                </DialogTitle>
                <DialogDescription>
                  {new Date(selectedConversation.startedAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                  {selectedConversation.rep &&
                    ` · ${selectedConversation.rep.name}`}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[60vh] overflow-y-auto space-y-1 py-2">
                {messagesLoading ? (
                  <div className="space-y-3 p-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="ml-auto h-8 w-2/3" />
                    <Skeleton className="h-8 w-1/2" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No messages found.
                  </p>
                ) : (
                  messages.map((message) => (
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
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
