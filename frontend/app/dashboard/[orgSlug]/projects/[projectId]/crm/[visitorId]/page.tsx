/**
 * CRM visitor detail page.
 * Shows full visitor profile with all CRM data sections.
 * @module app/dashboard/[orgSlug]/projects/[projectId]/crm/[visitorId]/page
 */
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChevronLeft } from "@tabler/icons-react";
import { useProject } from "../../layout";
import { getCrmVisitorDetail } from "@/lib/api/liveconnect-crm";
import { getReps } from "@/lib/api/liveconnect-dashboard";
import { VisitorContactCard } from "@/components/liveconnect/crm/visitor-contact-card";
import { PipelineStageSelect } from "@/components/liveconnect/crm/pipeline-stage-select";
import { LeadScoreBadge } from "@/components/liveconnect/crm/lead-score-badge";
import { RepAssignmentSelect } from "@/components/liveconnect/crm/rep-assignment-select";
import { VisitorTags } from "@/components/liveconnect/crm/visitor-tags";
import { VisitorEngagementStats } from "@/components/liveconnect/crm/visitor-engagement-stats";
import { VisitorTimeline } from "@/components/liveconnect/crm/visitor-timeline";
import { VisitorNotes } from "@/components/liveconnect/crm/visitor-notes";
import { VisitorConversationsList } from "@/components/liveconnect/crm/visitor-conversations-list";
import type { CrmVisitorDetail, LiveConnectRep } from "@/lib/types";

interface PageProps {
  params: Promise<{ visitorId: string }>;
}

/**
 * CRM visitor detail page component.
 */
export default function CrmVisitorDetailPage({ params }: PageProps) {
  const { visitorId } = use(params);
  const { projectId, orgSlug } = useProject();

  const [visitor, setVisitor] = useState<CrmVisitorDetail | null>(null);
  const [reps, setReps] = useState<LiveConnectRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [visitorData, repsData] = await Promise.all([
        getCrmVisitorDetail(projectId, visitorId),
        getReps(projectId),
      ]);
      setVisitor(visitorData);
      setReps(repsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visitor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, visitorId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !visitor) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error || "Visitor not found"}</p>
          <Link
            href={`/dashboard/${orgSlug}/projects/${projectId}/crm`}
            className="mt-4 inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <IconChevronLeft className="h-4 w-4" />
            Back to CRM
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link
        href={`/dashboard/${orgSlug}/projects/${projectId}/crm`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        Back to CRM
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {visitor.name || "Anonymous Visitor"}
          </h2>
          {visitor.email && (
            <p className="text-sm text-muted-foreground">{visitor.email}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Lead Score</p>
            <LeadScoreBadge score={visitor.leadScore} />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: Main content */}
        <div className="space-y-4 lg:col-span-2">
          <VisitorContactCard visitor={visitor} />
          <VisitorEngagementStats
            visitStats={visitor.visitStats}
            engagementStats={visitor.engagementStats}
          />
          <VisitorTimeline projectId={projectId} visitorId={visitorId} />
          <VisitorConversationsList projectId={projectId} visitorId={visitorId} />
        </div>

        {/* Right column: CRM Actions */}
        <div className="space-y-4">
          <PipelineStageSelect
            projectId={projectId}
            visitorId={visitorId}
            currentStage={visitor.pipelineStage}
            onStageChange={(stage) => {
              setVisitor((prev) => prev ? { ...prev, pipelineStage: stage } : prev);
            }}
          />
          <RepAssignmentSelect
            projectId={projectId}
            visitorId={visitorId}
            currentRep={visitor.assignedRep}
            reps={reps}
            onRepChange={(rep) => {
              setVisitor((prev) => prev ? { ...prev, assignedRep: rep } : prev);
            }}
          />
          <VisitorTags
            projectId={projectId}
            visitorId={visitorId}
            tags={visitor.tags}
            onTagsChange={(tags) => {
              setVisitor((prev) => prev ? { ...prev, tags } : prev);
            }}
          />
          <VisitorNotes projectId={projectId} visitorId={visitorId} />
        </div>
      </div>
    </div>
  );
}
