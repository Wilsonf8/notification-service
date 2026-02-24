/**
 * Badge component for pipeline stages with color coding.
 * @module components/liveconnect/crm/pipeline-stage-badge
 */

import { Badge } from "@/components/ui/badge";
import type { PipelineStage } from "@/lib/types";

/** Stage display configuration */
const STAGE_CONFIG: Record<PipelineStage, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-stone-500/20 text-stone-300" },
  ENGAGED: { label: "Engaged", className: "bg-blue-500/20 text-blue-400" },
  WON: { label: "Won", className: "bg-green-500/20 text-green-400" },
};

interface PipelineStageBadgeProps {
  stage: PipelineStage;
}

/**
 * Displays a colored badge for a pipeline stage.
 */
export function PipelineStageBadge({ stage }: PipelineStageBadgeProps) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.NEW;
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
