/**
 * Unified timeline component for CRM visitor events.
 * @module components/liveconnect/crm/visitor-timeline
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconEye,
  IconBrowser,
  IconPhone,
  IconNote,
  IconMessageCircle,
  IconChevronDown,
} from "@tabler/icons-react";
import { getVisitorTimeline } from "@/lib/api/liveconnect-crm";
import type { TimelineEvent } from "@/lib/types";

interface VisitorTimelineProps {
  projectId: string;
  visitorId: string;
}

/** Icon map for event types */
const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  VISIT: IconEye,
  PAGE_VIEW: IconBrowser,
  CALL: IconPhone,
  NOTE: IconNote,
  CONTACT_FORM: IconMessageCircle,
};

/** Label map for event types */
const EVENT_LABELS: Record<string, string> = {
  VISIT: "Visit",
  PAGE_VIEW: "Page View",
  CALL: "Video Call",
  NOTE: "Note",
  CONTACT_FORM: "Contact Form",
};

/**
 * Formats date for timeline display.
 */
function formatTimelineDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Displays a scrollable timeline of visitor events.
 */
export function VisitorTimeline({ projectId, visitorId }: VisitorTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchEvents = async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      const response = await getVisitorTimeline(projectId, visitorId, pageNum, 20);
      if (append) {
        setEvents((prev) => [...prev, ...response.events]);
      } else {
        setEvents(response.events);
      }
      setHasMore(pageNum < response.totalPages - 1);
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(0);
  }, [projectId, visitorId]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && events.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No events yet.
          </p>
        ) : (
          <div className="space-y-1">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.type] || IconEye;
              return (
                <div
                  key={`${event.type}-${event.id}`}
                  className="flex items-start gap-3 px-2 py-1.5"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {EVENT_LABELS[event.type] || event.type}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTimelineDate(event.timestamp)}
                      </span>
                    </div>
                    {event.type === "PAGE_VIEW" && event.data.title ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {String(event.data.title)}
                      </p>
                    ) : null}
                    {event.type === "NOTE" && event.data.content ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {String(event.data.content)}
                      </p>
                    ) : null}
                    {event.type === "CALL" && event.data.repName ? (
                      <p className="text-xs text-muted-foreground">
                        with {String(event.data.repName)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={loading}
                className="w-full"
              >
                <IconChevronDown className="mr-1 h-4 w-4" />
                Load more
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
