/**
 * Live Users Panel for LiveConnect dashboard.
 * Shows real-time visitors and pending requests with availability control.
 * @module components/liveconnect/live-users-panel
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconWifi,
  IconWifiOff,
  IconRefresh,
} from "@tabler/icons-react";
import { useLiveConnectWebSocket } from "@/lib/hooks/use-liveconnect-websocket";
import { useRepPresence } from "@/lib/hooks/use-rep-presence";
import { getVisitors, getReps } from "@/lib/api/liveconnect-dashboard";
import type { LiveConnectRep, VisitorsResponse } from "@/lib/types";
import { AvailabilityToggle } from "./availability-toggle";
import { RequestQueue } from "./request-queue";
import { VisitorList } from "./visitor-list";
import { VisitorDetail } from "./visitor-detail";

/** Props for the LiveUsersPanel component */
interface LiveUsersPanelProps {
  projectId: string;
}

/**
 * Live Users Panel component.
 * Main dashboard view for reps to see visitors and handle requests.
 */
export function LiveUsersPanel({ projectId }: LiveUsersPanelProps) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRep, setCurrentRep] = useState<LiveConnectRep | null>(null);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  // WebSocket for real-time updates
  const {
    visitors: wsVisitors,
    requests: wsRequests,
    isConnected,
    reconnect,
  } = useLiveConnectWebSocket(projectId, !!currentRep);

  // Rep presence management
  const {
    availability,
    presence,
    isUpdating: isAvailabilityUpdating,
    setAvailability,
  } = useRepPresence(
    projectId,
    currentRep?.availability,
    currentRep?.presence
  );

  // Local state for visitors/requests (merged with WS updates)
  const [visitors, setVisitors] = useState(wsVisitors);
  const [requests, setRequests] = useState(wsRequests);

  // Sync WS data with local state
  useEffect(() => {
    if (wsVisitors.length > 0 || wsRequests.length > 0) {
      setVisitors(wsVisitors);
      setRequests(wsRequests);
    }
  }, [wsVisitors, wsRequests]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setInitialLoading(true);
        setError(null);

        // Fetch current rep status
        const reps = await getReps(projectId);
        // Find the current user's rep record (assuming backend returns current user first or has a marker)
        // For now, take the first rep as a placeholder
        if (reps.length > 0) {
          setCurrentRep(reps[0]);
        }

        // Fetch initial visitors and queue
        const visitorsData: VisitorsResponse = await getVisitors(projectId);
        setVisitors(visitorsData.browsing);
        setRequests(visitorsData.queue);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [projectId]);

  // Find selected visitor
  const selectedVisitor = selectedVisitorId
    ? visitors.find((v) => v.id === selectedVisitorId) || null
    : null;

  if (initialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-64" />
          </div>
          <div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with connection status and availability */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <IconWifi className="h-4 w-4" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <IconWifiOff className="h-4 w-4" />
              <span>Disconnected</span>
              <Button variant="ghost" size="sm" onClick={reconnect}>
                <IconRefresh className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <AvailabilityToggle
          availability={availability}
          presence={presence}
          isUpdating={isAvailabilityUpdating}
          onAvailabilityChange={setAvailability}
        />
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: Queue and Visitors */}
        <div className="space-y-4 lg:col-span-2">
          {/* Request Queue */}
          <RequestQueue
            requests={requests}
            projectId={projectId}
          />

          {/* Browsing Visitors */}
          <VisitorList
            visitors={visitors}
            selectedVisitorId={selectedVisitorId}
            onSelectVisitor={setSelectedVisitorId}
          />
        </div>

        {/* Right column: Visitor Detail */}
        <div>
          <VisitorDetail
            visitor={selectedVisitor}
            projectId={projectId}
            onClose={() => setSelectedVisitorId(null)}
          />
        </div>
      </div>
    </div>
  );
}
