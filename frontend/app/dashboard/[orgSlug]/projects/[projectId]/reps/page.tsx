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

  /**
   * Fetches reps and team members.
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [repsData, membersData] = await Promise.all([
        getReps(projectId),
        getOrganizationMembers(orgSlug),
      ]);
      setReps(repsData);
      setTeamMembers(membersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, orgSlug]);

  // Non-admins shouldn't see this page (handled by layout tab visibility)
  // but add a fallback check
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to manage reps.
          </p>
        </CardContent>
      </Card>
    );
  }

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
                {limits
                  ? `${reps.length} / ${limits.maxRepsPerProject} reps`
                  : "Team members who can handle video calls for this project"}
              </CardDescription>
            </div>
            {(!limits || reps.length < limits.maxRepsPerProject) && (
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
            <li><strong>Available</strong> - Online and ready to take calls</li>
            <li><strong>Online (Unavailable)</strong> - Online but not accepting new calls</li>
            <li><strong>In Call</strong> - Currently on a video call</li>
            <li><strong>Offline</strong> - Not currently logged in</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
