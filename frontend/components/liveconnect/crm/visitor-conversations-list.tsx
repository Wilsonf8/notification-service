/**
 * Conversations list for a CRM visitor.
 * @module components/liveconnect/crm/visitor-conversations-list
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPhone, IconMessageCircle } from "@tabler/icons-react";
import { getVisitorConversations } from "@/lib/api/liveconnect-crm";
import type { LiveConnectConversation } from "@/lib/types";

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
 * Displays past conversations for a visitor.
 */
export function VisitorConversationsList({
  projectId,
  visitorId,
}: VisitorConversationsListProps) {
  const [conversations, setConversations] = useState<LiveConnectConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVisitorConversations(projectId, visitorId)
      .then((res) => setConversations(res.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, visitorId]);

  return (
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
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  {conv.type === "VIDEO_CALL" ? (
                    <IconPhone className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <IconMessageCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm">
                      {conv.type === "VIDEO_CALL" ? "Video Call" : "Contact Form"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.startedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
