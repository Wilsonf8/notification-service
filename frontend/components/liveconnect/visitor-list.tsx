/**
 * Visitor list component showing browsing visitors.
 * @module components/liveconnect/visitor-list
 */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconUser,
  IconCircleFilled,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
} from "@tabler/icons-react";
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
 * @param lastSeenAt - ISO timestamp of last seen time
 * @returns Human-readable relative time string
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
 * Formats relative time since previous visit ended.
 * @param previousVisitEndedAt - ISO timestamp of when the previous visit ended
 * @returns Human-readable "Last visit ..." string
 */
function formatPreviousVisit(previousVisitEndedAt: string): string {
  const prev = new Date(previousVisitEndedAt);
  const now = new Date();
  const diffMs = now.getTime() - prev.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Last visit just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Last visit ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last visit ${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `Last visit ${diffDays}d ago`;

  return `Last visit ${prev.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/**
 * Returns a country flag emoji from a 2-letter country code.
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Flag emoji string
 */
function countryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

/**
 * Returns a device type icon component.
 * @param deviceType - "desktop", "mobile", or "tablet"
 * @returns Icon component
 */
function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  const cls = "h-3 w-3 text-muted-foreground";
  switch (deviceType) {
    case "mobile":
      return <IconDeviceMobile className={cls} />;
    case "tablet":
      return <IconDeviceTablet className={cls} />;
    default:
      return <IconDeviceDesktop className={cls} />;
  }
}

/**
 * Individual visitor item.
 */
function VisitorItem({ visitor, isSelected, onClick }: VisitorItemProps) {
  const locationText = [visitor.city, visitor.country]
    .filter(Boolean)
    .join(", ");
  const browserText = [visitor.browserName, visitor.osName]
    .filter(Boolean)
    .join(" / ");

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
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">
            {visitor.name || "Anonymous"}
          </p>
          {visitor.countryCode && (
            <span className="flex-shrink-0 text-xs" title={visitor.country || undefined}>
              {countryFlag(visitor.countryCode)}
            </span>
          )}
          {visitor.deviceType && (
            <DeviceIcon deviceType={visitor.deviceType} />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {visitor.currentPageTitle || visitor.currentPage || "Unknown page"}
        </p>
        {(locationText || browserText) && (
          <p className="truncate text-[10px] text-muted-foreground/70">
            {[locationText, browserText].filter(Boolean).join(" \u00B7 ")}
          </p>
        )}
      </div>
      {visitor.isFirstVisit ? (
        <span className="flex-shrink-0 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-1.5 py-0.5 uppercase font-mono">
          NEW
        </span>
      ) : visitor.previousVisitEndedAt ? (
        <span className="flex-shrink-0 text-[10px] text-muted-foreground">
          {formatPreviousVisit(visitor.previousVisitEndedAt)}
        </span>
      ) : null}
      <span className="flex-shrink-0 text-xs text-muted-foreground">
        {formatLastSeen(visitor.lastSeenAt)}
      </span>
    </button>
  );
}
