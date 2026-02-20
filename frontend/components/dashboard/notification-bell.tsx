/**
 * Notification bell component for displaying pending organization invitations.
 * Polls for pending invitation count and shows a dropdown with invite details.
 * @module components/dashboard/notification-bell
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconBell, IconCheck, IconX } from "@tabler/icons-react";
import {
  getPendingInvitationCount,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "@/lib/api/invitations";
import { useOrganization } from "@/lib/contexts/organization-context";
import type { OrganizationInvitation } from "@/lib/types";

/** Polling interval for checking pending invitation count (30 seconds) */
const POLL_INTERVAL = 30_000;

/**
 * Notification bell with badge showing pending invitation count.
 * Opens a dropdown with invitation details and accept/decline actions.
 */
export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const { refreshOrgs } = useOrganization();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Fetches the pending invitation count.
   */
  const fetchCount = useCallback(async () => {
    try {
      const data = await getPendingInvitationCount();
      setCount(data.count);
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  /**
   * Fetches full pending invitations when dropdown opens.
   */
  const fetchInvitations = useCallback(async () => {
    try {
      setLoadingInvites(true);
      const data = await getPendingInvitations();
      setInvitations(data);
      setCount(data.length);
    } catch {
      // Silently ignore
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  // Poll for count
  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  // Fetch full invitations when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, fetchInvitations]);

  /**
   * Handles accepting an invitation.
   */
  const handleAccept = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      setCount((prev) => Math.max(0, prev - 1));
      await refreshOrgs();
    } catch {
      // Error silently handled
    }
  };

  /**
   * Handles declining an invitation.
   */
  const handleDecline = async (invitationId: string) => {
    try {
      await declineInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      setCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Error silently handled
    }
  };

  /**
   * Gets the badge variant for a role.
   */
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center outline-none">
        <IconBell className="h-5 w-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center bg-yellow-500 px-1 text-[10px] font-bold text-black">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">Invitations</p>
        </div>
        <DropdownMenuSeparator />
        {loadingInvites ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : invitations.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No pending invitations
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {invitations.map((invitation, index) => (
              <div key={invitation.id}>
                {index > 0 && <DropdownMenuSeparator />}
                <div className="px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {invitation.organizationName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invited by @{invitation.inviterUsername}
                      </p>
                      <div className="mt-1">
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAccept(invitation.id);
                        }}
                        title="Accept"
                      >
                        <IconCheck className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDecline(invitation.id);
                        }}
                        title="Decline"
                      >
                        <IconX className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
