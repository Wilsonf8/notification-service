/**
 * Visitor detail panel showing selected visitor information.
 * @module components/liveconnect/visitor-detail
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconUser,
  IconX,
  IconPhone,
  IconMail,
  IconLink,
  IconLoader2,
  IconCircleFilled,
  IconMapPin,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconBrowser,
} from "@tabler/icons-react";
import { pingVisitor, getVisitorVisits, getPageViews } from "@/lib/api/liveconnect-dashboard";
import type { LiveConnectVisitor, VisitorDetailResponse, PageView } from "@/lib/types";

/**
 * Formats a duration in seconds to a human-readable string.
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g. "5m 32s", "2h 15m")
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  return remainMin > 0 ? `${hr}h ${remainMin}m` : `${hr}h`;
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
function formatDurationMs(ms: number): string {
  return formatDuration(Math.floor(ms / 1000));
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

/** Props for the VisitorDetail component */
interface VisitorDetailProps {
  visitor: LiveConnectVisitor | null;
  projectId: string;
  onClose: () => void;
  deviceSessionId?: string;
}

/**
 * Visitor detail panel component.
 * Shows detailed information about a selected visitor with ping action.
 */
export function VisitorDetail({ visitor, projectId, onClose, deviceSessionId }: VisitorDetailProps) {
  const [isPinging, setIsPinging] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [visitData, setVisitData] = useState<VisitorDetailResponse | null>(null);
  const [visitDataLoading, setVisitDataLoading] = useState(false);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [pageViewsLoading, setPageViewsLoading] = useState(false);

  /**
   * Fetches visit data and page views when the selected visitor changes.
   */
  useEffect(() => {
    if (!visitor) {
      setVisitData(null);
      setPageViews([]);
      return;
    }

    let cancelled = false;
    setVisitDataLoading(true);
    setPageViewsLoading(true);

    getVisitorVisits(projectId, visitor.id)
      .then((data) => {
        if (!cancelled) setVisitData(data);
      })
      .catch(() => {
        if (!cancelled) setVisitData(null);
      })
      .finally(() => {
        if (!cancelled) setVisitDataLoading(false);
      });

    getPageViews(projectId, visitor.id)
      .then((data) => {
        if (!cancelled) setPageViews(data);
      })
      .catch(() => {
        if (!cancelled) setPageViews([]);
      })
      .finally(() => {
        if (!cancelled) setPageViewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visitor?.id, projectId]);

  /**
   * Handles pinging the visitor to initiate a call.
   */
  const handlePing = async () => {
    if (!visitor) return;

    try {
      setIsPinging(true);
      setPingError(null);
      setPingSuccess(false);
      await pingVisitor(projectId, visitor.id, deviceSessionId);
      setPingSuccess(true);
      // Reset success message after 3 seconds
      setTimeout(() => setPingSuccess(false), 3000);
    } catch (err) {
      setPingError(err instanceof Error ? err.message : "Failed to ping visitor");
    } finally {
      setIsPinging(false);
    }
  };

  if (!visitor) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <IconUser className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Select a visitor to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  const locationParts = [visitor.city, visitor.country].filter(Boolean);
  const locationText = locationParts.join(", ");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Visitor Details</CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <IconX className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visitor avatar and name */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center bg-muted">
            <IconUser className="h-6 w-6 text-muted-foreground" />
            {visitor.isConnected && (
              <IconCircleFilled className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-green-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-medium">{visitor.name || "Anonymous"}</p>
              {visitor.countryCode && (
                <span className="text-sm" title={visitor.country || undefined}>
                  {countryFlag(visitor.countryCode)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {visitor.isConnected ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Visitor details */}
        <div className="space-y-2 text-sm">
          {visitor.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconMail className="h-4 w-4" />
              <span className="truncate">{visitor.email}</span>
            </div>
          )}
          {locationText && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconMapPin className="h-4 w-4" />
              <span className="truncate">{locationText}</span>
            </div>
          )}
          {(visitor.browserName || visitor.osName) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconBrowser className="h-4 w-4" />
              <span className="truncate">
                {[visitor.browserName, visitor.osName].filter(Boolean).join(" / ")}
              </span>
            </div>
          )}
          {visitor.deviceType && (
            <div className="flex items-center gap-2 text-muted-foreground">
              {visitor.deviceType === "mobile" ? (
                <IconDeviceMobile className="h-4 w-4" />
              ) : visitor.deviceType === "tablet" ? (
                <IconDeviceTablet className="h-4 w-4" />
              ) : (
                <IconDeviceDesktop className="h-4 w-4" />
              )}
              <span className="capitalize">{visitor.deviceType}</span>
            </div>
          )}
          {visitor.currentPage && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <IconLink className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="min-w-0">
                {visitor.currentPageTitle && (
                  <p className="truncate font-medium text-foreground">
                    {visitor.currentPageTitle}
                  </p>
                )}
                <p className="truncate text-xs">{visitor.currentPage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Visit Activity */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visit Activity</p>
          {visitDataLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : visitData ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 p-2">
                <p className="text-lg font-bold">{visitData.stats.visits24h}</p>
                <p className="text-xs text-muted-foreground">24h</p>
              </div>
              <div className="bg-muted/50 p-2">
                <p className="text-lg font-bold">{visitData.stats.visits3d}</p>
                <p className="text-xs text-muted-foreground">3 days</p>
              </div>
              <div className="bg-muted/50 p-2">
                <p className="text-lg font-bold">{visitData.stats.visits7d}</p>
                <p className="text-xs text-muted-foreground">7 days</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No visit data available</p>
          )}
        </div>

        {/* Browsing History */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Browsing History</p>
          {pageViewsLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : pageViews.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {pageViews.map((pv, i) => (
                <div key={i} className="p-1.5 text-xs bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-foreground">
                      {pv.title || pv.url}
                    </p>
                    {pv.durationMs != null && (
                      <span className="flex-shrink-0 font-mono text-muted-foreground">
                        {formatDurationMs(pv.durationMs)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    {pv.title && (
                      <p className="truncate text-muted-foreground">{pv.url}</p>
                    )}
                    <span className="flex-shrink-0 text-muted-foreground">
                      {new Date(pv.visitedAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No browsing history recorded</p>
          )}
        </div>

        {/* Engagement Activity */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Engagement Activity</p>
          {visitDataLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : visitData?.engagement ? (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Pings Received</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.pingsReceived24h}</p>
                    <p className="text-xs text-muted-foreground">24h</p>
                  </div>
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.pingsReceived3d}</p>
                    <p className="text-xs text-muted-foreground">3 days</p>
                  </div>
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.pingsReceived7d}</p>
                    <p className="text-xs text-muted-foreground">7 days</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Requests Sent</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.requestsSent24h}</p>
                    <p className="text-xs text-muted-foreground">24h</p>
                  </div>
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.requestsSent3d}</p>
                    <p className="text-xs text-muted-foreground">3 days</p>
                  </div>
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.requestsSent7d}</p>
                    <p className="text-xs text-muted-foreground">7 days</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Calls Joined</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.callsJoined24h}</p>
                    <p className="text-xs text-muted-foreground">24h</p>
                  </div>
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.callsJoined3d}</p>
                    <p className="text-xs text-muted-foreground">3 days</p>
                  </div>
                  <div className="bg-muted/50 p-2">
                    <p className="text-lg font-bold">{visitData.engagement.callsJoined7d}</p>
                    <p className="text-xs text-muted-foreground">7 days</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No engagement data available</p>
          )}
        </div>

        {/* Visit History */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visit History</p>
          {visitDataLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : visitData && visitData.recentVisits.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {visitData.recentVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-1.5 text-xs bg-muted/30">
                  <span className="text-muted-foreground">
                    {new Date(visit.startedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    {new Date(visit.startedAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-mono">
                    {visit.durationSeconds != null
                      ? formatDuration(visit.durationSeconds)
                      : "Active"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No visits recorded</p>
          )}
        </div>

        {/* Ping action */}
        <div className="space-y-2 border-t pt-4">
          <Button
            className="w-full gap-2"
            onClick={handlePing}
            disabled={isPinging || !visitor.isPingable || !visitor.isConnected}
          >
            {isPinging ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconPhone className="h-4 w-4" />
            )}
            Ping User
          </Button>

          {!visitor.isPingable && visitor.isConnected && (
            <p className="text-center text-xs text-muted-foreground">
              This visitor was recently pinged. Please wait before pinging again.
            </p>
          )}

          {!visitor.isConnected && (
            <p className="text-center text-xs text-muted-foreground">
              Visitor is currently offline.
            </p>
          )}

          {pingSuccess && (
            <p className="text-center text-xs text-green-600">
              Ping sent! Waiting for visitor to respond...
            </p>
          )}

          {pingError && (
            <p className="text-center text-xs text-destructive">
              {pingError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
