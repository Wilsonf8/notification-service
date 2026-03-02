/**
 * In Call section component for the LiveConnect dashboard.
 * Shows active calls with visitor name, rep name, and live duration timer.
 * Uses a single shared timer instead of per-item intervals.
 * @module components/liveconnect/in-call-section
 */
"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconPhone } from "@tabler/icons-react";
import type { ActiveCall } from "@/lib/types";

/** Props for the InCallSection component */
interface InCallSectionProps {
  activeCalls: ActiveCall[];
}

/**
 * In Call section component.
 * Displays active calls with live duration timers.
 * Uses a single setInterval for all items instead of one per item.
 */
export function InCallSection({ activeCalls }: InCallSectionProps) {
  // Single timer drives a tick counter that forces all items to recalculate
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (activeCalls.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCalls.length]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center bg-green-600 text-xs font-bold text-white">
            {activeCalls.length}
          </span>
          In Call
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeCalls.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No active calls
          </p>
        ) : (
          <div className="space-y-2">
            {activeCalls.map((call) => (
              <InCallItem key={call.conversationId} call={call} tick={tick} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Props for the InCallItem component */
interface InCallItemProps {
  call: ActiveCall;
  tick: number;
}

/**
 * Formats seconds as MM:SS or H:MM:SS for longer calls.
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Individual call item with live duration timer.
 * Memoized to prevent unnecessary re-renders from sibling updates.
 */
const InCallItem = memo(function InCallItem({ call, tick }: InCallItemProps) {
  // Calculate duration from tick (driven by parent's single timer)
  const startedAt = new Date(call.startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const duration = formatDuration(elapsed);

  return (
    <div className="flex items-center justify-between gap-4 border p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-green-600/10">
          <IconPhone className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p className="font-medium">
            {call.visitorName || "Anonymous Visitor"}
          </p>
          <p className="text-xs text-muted-foreground">
            with {call.repName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="tabular-nums text-sm font-medium text-green-600">
          {duration}
        </span>
      </div>
    </div>
  );
});
