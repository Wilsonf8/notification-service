/**
 * Visitor list component showing browsing visitors.
 * @module components/liveconnect/visitor-list
 */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconUser, IconCircleFilled } from "@tabler/icons-react";
import type { LiveConnectVisitor } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Props for the VisitorList component */
interface VisitorListProps {
  visitors: LiveConnectVisitor[];
  selectedVisitorId: string | null;
  onSelectVisitor: (visitorId: string | null) => void;
}

/**
 * Visitor list component.
 * Shows currently browsing visitors with selection support.
 */
export function VisitorList({
  visitors,
  selectedVisitorId,
  onSelectVisitor,
}: VisitorListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-muted-foreground">Browsing</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({visitors.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visitors.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No visitors currently browsing
          </p>
        ) : (
          <div className="space-y-1">
            {visitors.map((visitor) => (
              <VisitorItem
                key={visitor.id}
                visitor={visitor}
                isSelected={visitor.id === selectedVisitorId}
                onClick={() =>
                  onSelectVisitor(visitor.id === selectedVisitorId ? null : visitor.id)
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Props for the VisitorItem component */
interface VisitorItemProps {
  visitor: LiveConnectVisitor;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Formats relative time since last seen.
 */
function formatLastSeen(lastSeenAt: string): string {
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

/**
 * Individual visitor item.
 */
function VisitorItem({ visitor, isSelected, onClick }: VisitorItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 p-2 text-left transition-colors",
        isSelected
          ? "bg-primary/10 border-l-2 border-l-primary"
          : "hover:bg-muted"
      )}
    >
      <div className="relative flex h-8 w-8 items-center justify-center bg-muted">
        <IconUser className="h-4 w-4 text-muted-foreground" />
        {visitor.isConnected && (
          <IconCircleFilled className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-green-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {visitor.name || "Anonymous"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {visitor.currentPageTitle || visitor.currentPage || "Unknown page"}
        </p>
      </div>
      <span className="flex-shrink-0 text-xs text-muted-foreground">
        {formatLastSeen(visitor.lastSeenAt)}
      </span>
    </button>
  );
}
