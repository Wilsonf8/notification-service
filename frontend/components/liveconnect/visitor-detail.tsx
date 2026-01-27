/**
 * Visitor detail panel showing selected visitor information.
 * @module components/liveconnect/visitor-detail
 */
"use client";

import { useState } from "react";
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
} from "@tabler/icons-react";
import { pingVisitor } from "@/lib/api/liveconnect-dashboard";
import type { LiveConnectVisitor } from "@/lib/types";

/** Props for the VisitorDetail component */
interface VisitorDetailProps {
  visitor: LiveConnectVisitor | null;
  projectId: string;
  onClose: () => void;
}

/**
 * Visitor detail panel component.
 * Shows detailed information about a selected visitor with ping action.
 */
export function VisitorDetail({ visitor, projectId, onClose }: VisitorDetailProps) {
  const [isPinging, setIsPinging] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const [pingSuccess, setPingSuccess] = useState(false);

  /**
   * Handles pinging the visitor to initiate a call.
   */
  const handlePing = async () => {
    if (!visitor) return;

    try {
      setIsPinging(true);
      setPingError(null);
      setPingSuccess(false);
      await pingVisitor(projectId, visitor.visitorId);
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
            <p className="font-medium">{visitor.name || "Anonymous"}</p>
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
