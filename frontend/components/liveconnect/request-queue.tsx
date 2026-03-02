/**
 * Request queue component for pending call requests.
 * Shows countdown timers and accept/dismiss actions.
 * Uses a single shared timer instead of per-item intervals.
 * @module components/liveconnect/request-queue
 */
"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconPhone,
  IconX,
  IconUser,
  IconLoader2,
} from "@tabler/icons-react";
import { acceptRequest, dismissRequest } from "@/lib/api/liveconnect-dashboard";
import type { LiveConnectRequest } from "@/lib/types";

/** Props for the RequestQueue component */
interface RequestQueueProps {
  requests: LiveConnectRequest[];
  projectId: string;
  deviceSessionId?: string;
}

/**
 * Request queue component.
 * Displays pending call requests with countdown timers.
 * Uses a single setInterval for all items instead of one per item.
 */
export function RequestQueue({ requests, projectId, deviceSessionId }: RequestQueueProps) {
  // Single timer drives a tick counter that forces all items to re-render together
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (requests.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [requests.length]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center bg-destructive text-xs font-bold text-destructive-foreground">
            {requests.length}
          </span>
          Waiting to Talk
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No pending requests
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                projectId={projectId}
                deviceSessionId={deviceSessionId}
                tick={tick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Props for the RequestItem component */
interface RequestItemProps {
  request: LiveConnectRequest;
  projectId: string;
  deviceSessionId?: string;
  tick: number;
}

/**
 * Individual request item with countdown and actions.
 * Memoized to prevent unnecessary re-renders from sibling updates.
 */
const RequestItem = memo(function RequestItem({ request, projectId, deviceSessionId, tick }: RequestItemProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Calculate time remaining from tick (driven by parent's single timer)
  const expiresAt = new Date(request.expiresAt).getTime();
  const timeLeft = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

  /**
   * Formats seconds as MM:SS.
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * Handles accepting the request.
   */
  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      const response = await acceptRequest(projectId, request.id, deviceSessionId);
      // Navigate to the call page with rep auth params including LiveKit URL
      const callUrl = `/call/${response.roomName}?token=${encodeURIComponent(response.token)}&conversation=${response.conversationId}&project=${projectId}&liveKitUrl=${encodeURIComponent(response.liveKitUrl)}&visitor=${response.visitorId}`;
      window.open(callUrl, "_blank", "width=900,height=600");
    } catch (err) {
      setAcceptError("This request was already accepted by another rep");
    } finally {
      setIsAccepting(false);
    }
  };

  /**
   * Handles dismissing the request.
   */
  const handleDismiss = async () => {
    try {
      setIsDismissing(true);
      await dismissRequest(projectId, request.id);
    } catch (err) {
      console.error("Failed to dismiss request:", err);
    } finally {
      setIsDismissing(false);
    }
  };

  const isExpired = timeLeft === 0;
  const isUrgent = timeLeft <= 30 && timeLeft > 0;

  return (
    <div className="border p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-muted">
            <IconUser className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">
              {request.visitorName || "Anonymous Visitor"}
            </p>
            <p className={`text-xs tabular-nums ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
              {isExpired ? "Expired" : `${formatTime(timeLeft)} left`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={isAccepting || isDismissing || isExpired}
            className="gap-1"
          >
            {isAccepting ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconPhone className="h-4 w-4" />
            )}
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={isAccepting || isDismissing}
          >
            {isDismissing ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconX className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {acceptError && (
        <p className="mt-2 text-xs text-destructive">{acceptError}</p>
      )}
    </div>
  );
});
