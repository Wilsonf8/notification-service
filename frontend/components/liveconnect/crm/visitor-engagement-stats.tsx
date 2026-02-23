/**
 * Engagement statistics cards for a CRM visitor.
 * @module components/liveconnect/crm/visitor-engagement-stats
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VisitorVisitStats, VisitorEngagementStats as EngagementStats } from "@/lib/types";

interface VisitorEngagementStatsProps {
  visitStats: VisitorVisitStats;
  engagementStats: EngagementStats;
}

/**
 * Displays engagement statistics in a compact card grid.
 */
export function VisitorEngagementStats({
  visitStats,
  engagementStats,
}: VisitorEngagementStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Engagement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <StatGroup
            label="Visits"
            values={[
              { label: "24h", value: visitStats.visits24h },
              { label: "3d", value: visitStats.visits3d },
              { label: "7d", value: visitStats.visits7d },
            ]}
            total={visitStats.total}
          />
          <StatGroup
            label="Requests"
            values={[
              { label: "24h", value: engagementStats.requestsSent24h },
              { label: "3d", value: engagementStats.requestsSent3d },
              { label: "7d", value: engagementStats.requestsSent7d },
            ]}
          />
          <StatGroup
            label="Calls"
            values={[
              { label: "24h", value: engagementStats.callsJoined24h },
              { label: "3d", value: engagementStats.callsJoined3d },
              { label: "7d", value: engagementStats.callsJoined7d },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatGroupProps {
  label: string;
  values: { label: string; value: number }[];
  total?: number;
}

function StatGroup({ label, values, total }: StatGroupProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1">
        {values.map((v) => (
          <div key={v.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{v.label}</span>
            <span className="font-mono">{v.value}</span>
          </div>
        ))}
        {total !== undefined && (
          <div className="flex justify-between border-t pt-1 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono font-medium">{total}</span>
          </div>
        )}
      </div>
    </div>
  );
}
