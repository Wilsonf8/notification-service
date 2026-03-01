/**
 * Reps management page for LiveConnect projects.
 * Allows admins to add and remove reps.
 * @module app/dashboard/[orgSlug]/projects/[projectId]/reps/page
 */
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProject } from "../layout";
import { getReps } from "@/lib/api/liveconnect-dashboard";
import { getOrganizationMembers } from "@/lib/api/organizations";
import { RepList } from "@/components/liveconnect/rep-list";
import { AddRepDialog } from "@/components/liveconnect/add-rep-dialog";
import { useTierLimits } from "@/lib/hooks/use-tier-limits";
import { useLiveConnectWebSocket } from "@/lib/hooks/use-liveconnect-websocket";
import type { LiveConnectRep, OrganizationMember } from "@/lib/types";

/**
 * Reps management page component.
 */
export default function RepsPage() {
  const { projectId, orgSlug, isAdmin } = useProject();
  const { limits, refresh: refreshLimits } = useTierLimits(orgSlug);

  const [reps, setReps] = useState<LiveConnectRep[]>([]);
  const [teamMembers, setTeamMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time rep status updates via WebSocket
  useLiveConnectWebSocket(
    projectId,
    true,
    undefined,
    undefined,
    undefined,
    setReps
  );

  /**
   * Fetches reps and team members.
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (isAdmin) {
        const [repsData, membersData] = await Promise.all([
          getReps(projectId),
          getOrganizationMembers(orgSlug),
        ]);
        setReps(repsData);
        setTeamMembers(membersData);
      } else {
        const repsData = await getReps(projectId);
        setReps(repsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, orgSlug]);

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Reps</CardTitle>
              <CardDescription>
                {isAdmin && limits
                  ? `${reps.length} / ${limits.maxRepsPerProject} reps`
                  : "Team members who can handle video calls for this project"}
              </CardDescription>
            </div>
            {isAdmin && (!limits || reps.length < limits.maxRepsPerProject) && (
              <AddRepDialog
                projectId={projectId}
                teamMembers={teamMembers}
                existingReps={reps}
                onRepAdded={() => { fetchData(); refreshLimits(); }}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <RepList
            reps={reps}
            projectId={projectId}
            onRepRemoved={fetchData}
            loading={loading}
            readOnly={!isAdmin}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Reps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Sales reps are team members who can receive and handle video calls from
            visitors on your website. Only reps assigned to this project will see
            incoming call requests.
          </p>
          <p>
            <strong>Status meanings:</strong>
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong>Online</strong> - Connected and logged in</li>
            <li><strong>In Call</strong> - Currently on a video call</li>
            <li><strong>Offline</strong> - Not currently logged in</li>
            <li><strong>Available</strong> - Ready to take calls</li>
            <li><strong>Unavailable</strong> - Not accepting new calls</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
