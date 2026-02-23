/**
 * Rep assignment dropdown for CRM visitors.
 * @module components/liveconnect/crm/rep-assignment-select
 */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";
import { assignRepToVisitor, unassignRepFromVisitor } from "@/lib/api/liveconnect-crm";
import type { LiveConnectRep } from "@/lib/types";

interface RepAssignmentSelectProps {
  projectId: string;
  visitorId: string;
  currentRep: LiveConnectRep | null;
  reps: LiveConnectRep[];
  onUpdate: () => void;
}

/**
 * Dropdown to assign or unassign a rep to a visitor.
 */
export function RepAssignmentSelect({
  projectId,
  visitorId,
  currentRep,
  reps,
  onUpdate,
}: RepAssignmentSelectProps) {
  const [updating, setUpdating] = useState(false);

  const handleAssign = async (repId: string) => {
    if (updating) return;
    try {
      setUpdating(true);
      await assignRepToVisitor(projectId, visitorId, repId);
      onUpdate();
    } catch {
      // silently handled
    } finally {
      setUpdating(false);
    }
  };

  const handleUnassign = async () => {
    if (updating) return;
    try {
      setUpdating(true);
      await unassignRepFromVisitor(projectId, visitorId);
      onUpdate();
    } catch {
      // silently handled
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Assigned Rep</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Select
            value={currentRep?.id || "unassigned"}
            onValueChange={(v) => {
              if (!v || v === "unassigned") return;
              handleAssign(v);
            }}
            disabled={updating}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {reps.map((rep) => (
                <SelectItem key={rep.id} value={rep.id}>
                  {rep.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentRep && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleUnassign}
              disabled={updating}
              className="shrink-0"
            >
              <IconX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
