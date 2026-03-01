/**
 * Rep list component showing project reps with status.
 * @module components/liveconnect/rep-list
 */
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  IconUser,
  IconTrash,
  IconCircleFilled,
  IconLoader2,
} from "@tabler/icons-react";
import { removeRep } from "@/lib/api/liveconnect-dashboard";
import type { LiveConnectRep } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Props for the RepList component */
interface RepListProps {
  reps: LiveConnectRep[];
  projectId: string;
  onRepRemoved?: () => void;
  loading?: boolean;
  /** When true, hides the Actions column and delete buttons */
  readOnly?: boolean;
}

/**
 * Gets status color class based on presence.
 */
function getStatusColor(rep: LiveConnectRep): string {
  if (rep.presence === "IN_CALL") {
    return "text-yellow-500";
  }
  if (rep.presence === "ONLINE" && rep.availability === "AVAILABLE") {
    return "text-green-500";
  }
  if (rep.presence === "ONLINE") {
    return "text-blue-500";
  }
  return "text-muted-foreground";
}

/**
 * Gets status label based on presence and availability.
 */
function getStatusLabel(rep: LiveConnectRep): string {
  if (rep.presence === "IN_CALL") {
    return "In Call";
  }
  if (rep.presence === "ONLINE" && rep.availability === "AVAILABLE") {
    return "Available";
  }
  if (rep.presence === "ONLINE") {
    return "Online (Unavailable)";
  }
  return "Offline";
}

/**
 * Rep list component.
 * Shows a table of project reps with their status.
 */
export function RepList({ reps, projectId, onRepRemoved, loading, readOnly }: RepListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  /**
   * Handles removing a rep from the project.
   */
  const handleRemove = async (repUserId: string) => {
    try {
      setRemovingId(repUserId);
      await removeRep(projectId, repUserId);
      onRepRemoved?.();
    } catch (err) {
      console.error("Failed to remove rep:", err);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Loading reps...</p>
      </div>
    );
  }

  if (reps.length === 0) {
    return (
      <div className="py-8 text-center">
        <IconUser className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          No reps assigned to this project yet
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rep</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          {!readOnly && <TableHead className="w-[80px]">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {reps.map((rep) => (
          <TableRow key={rep.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center bg-muted">
                  <IconUser className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-medium">{rep.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground">{rep.email}</span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <IconCircleFilled className={cn("h-3 w-3", getStatusColor(rep))} />
                <span className="text-sm">{getStatusLabel(rep)}</span>
              </div>
            </TableCell>
            {!readOnly && (
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={removingId === rep.userId}
                      />
                    }
                  >
                    {removingId === rep.userId ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconTrash className="h-4 w-4 text-destructive" />
                    )}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Rep</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {rep.name} from this project?
                        They will no longer be able to handle calls for this project.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleRemove(rep.userId)}
                      >
                        Remove Rep
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
