/**
 * Conversation list component showing past conversations.
 * @module components/liveconnect/conversation-list
 */
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  IconVideo,
  IconMessageCircle,
  IconUser,
  IconChevronRight,
} from "@tabler/icons-react";
import type { LiveConnectConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Props for the ConversationList component */
interface ConversationListProps {
  conversations: LiveConnectConversation[];
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  loading?: boolean;
}

/**
 * Formats call duration in seconds to human readable format.
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "-";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Formats date to readable format.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Conversation list component.
 * Shows a table of past conversations.
 */
export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="py-8 text-center">
        <IconMessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          No conversations yet
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Visitor</TableHead>
          <TableHead className="hidden sm:table-cell">Rep</TableHead>
          <TableHead className="hidden md:table-cell">Duration</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {conversations.map((conversation) => (
          <TableRow
            key={conversation.id}
            className={cn(
              "cursor-pointer",
              selectedId === conversation.id && "bg-muted"
            )}
            onClick={() => onSelect(conversation.id)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                {conversation.type === "VIDEO_CALL" ? (
                  <IconVideo className="h-4 w-4 text-primary" />
                ) : (
                  <IconMessageCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="hidden sm:inline text-xs">
                  {conversation.type === "VIDEO_CALL" ? "Video Call" : "Contact Form"}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <IconUser className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[120px]">
                  {conversation.visitorName || "Anonymous"}
                </span>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <span className="truncate max-w-[100px]">
                {conversation.repName || "-"}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {formatDuration(conversation.callDurationSeconds)}
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground">
                {formatDate(conversation.startedAt)}
              </span>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon-sm">
                <IconChevronRight className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
