/**
 * Add rep dialog component for adding team members as reps.
 * @module components/liveconnect/add-rep-dialog
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { IconPlus, IconUser } from "@tabler/icons-react";
import { addRep } from "@/lib/api/liveconnect-dashboard";
import type { OrganizationMember, LiveConnectRep } from "@/lib/types";

/** Props for the AddRepDialog component */
interface AddRepDialogProps {
  projectId: string;
  teamMembers: OrganizationMember[];
  existingReps: LiveConnectRep[];
  onRepAdded: () => void;
}

/**
 * Add rep dialog component.
 * Allows admins to add team members as reps for a project.
 */
export function AddRepDialog({
  projectId,
  teamMembers,
  existingReps,
  onRepAdded,
}: AddRepDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out members who are already reps
  const existingRepUserIds = new Set(existingReps.map((r) => r.userId));
  const availableMembers = teamMembers.filter(
    (m) => !existingRepUserIds.has(m.userId)
  );

  /**
   * Handles adding the selected member as a rep.
   */
  const handleAdd = async () => {
    if (!selectedUserId) return;

    try {
      setAdding(true);
      setError(null);
      await addRep(projectId, selectedUserId);
      setOpen(false);
      setSelectedUserId(null);
      onRepAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rep");
    } finally {
      setAdding(false);
    }
  };

  /**
   * Handles dialog open state change.
   */
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedUserId(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <IconPlus className="h-4 w-4" />
        Add Rep
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Rep</DialogTitle>
          <DialogDescription>
            Add a team member as a sales rep for this project.
            They will be able to handle video calls from visitors.
          </DialogDescription>
        </DialogHeader>

        {availableMembers.length === 0 ? (
          <div className="py-6 text-center">
            <IconUser className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              All team members are already reps for this project.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member">Team Member</Label>
              <Select
                value={selectedUserId || undefined}
                onValueChange={(v) => setSelectedUserId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      <div className="flex items-center gap-2">
                        <span>
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.username}
                        </span>
                        {member.email && (
                          <span className="text-muted-foreground">
                            ({member.email})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {availableMembers.length > 0 && (
            <Button
              onClick={handleAdd}
              disabled={adding || !selectedUserId}
            >
              {adding ? "Adding..." : "Add Rep"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
