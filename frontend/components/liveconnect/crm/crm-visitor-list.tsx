/**
 * CRM visitor list table component.
 * @module components/liveconnect/crm/crm-visitor-list
 */
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineStageBadge } from "./pipeline-stage-badge";
import { LeadScoreBadge } from "./lead-score-badge";
import type { CrmVisitorListItem } from "@/lib/types";
import { IconUser } from "@tabler/icons-react";

interface CrmVisitorListProps {
  visitors: CrmVisitorListItem[];
  loading: boolean;
  onSelect: (visitorId: string) => void;
}

/**
 * Formats a date string as relative time (e.g., "2h ago").
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Renders the CRM visitor list as a table.
 */
export function CrmVisitorList({ visitors, loading, onSelect }: CrmVisitorListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (visitors.length === 0) {
    return (
      <div className="py-12 text-center">
        <IconUser className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          No visitors found for this time range.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Visitor</TableHead>
          <TableHead className="hidden md:table-cell">Location</TableHead>
          <TableHead className="hidden sm:table-cell">Last Seen</TableHead>
          <TableHead className="hidden lg:table-cell">Visits</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead className="hidden xl:table-cell">Tags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visitors.map((visitor) => (
          <TableRow
            key={visitor.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSelect(visitor.id)}
          >
            <TableCell>
              <div>
                <p className="font-medium">
                  {visitor.name || "Anonymous"}
                </p>
                {visitor.email && (
                  <p className="text-xs text-muted-foreground">{visitor.email}</p>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <span className="text-sm text-muted-foreground">
                {[visitor.city, visitor.country].filter(Boolean).join(", ") || "\u2014"}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <span className="text-sm text-muted-foreground">
                {formatRelativeTime(visitor.lastSeenAt)}
              </span>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <span className="text-sm">{visitor.visitCount}</span>
            </TableCell>
            <TableCell>
              <LeadScoreBadge score={visitor.leadScore} />
            </TableCell>
            <TableCell>
              <PipelineStageBadge stage={visitor.pipelineStage} />
            </TableCell>
            <TableCell className="hidden xl:table-cell">
              <div className="flex flex-wrap gap-1">
                {visitor.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-1.5 py-0.5 text-xs"
                    style={{ backgroundColor: tag.color + "20", color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
                {visitor.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{visitor.tags.length - 3}
                  </span>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
