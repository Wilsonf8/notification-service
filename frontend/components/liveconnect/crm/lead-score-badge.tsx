/**
 * Badge component for lead scores with color coding.
 * @module components/liveconnect/crm/lead-score-badge
 */

import { cn } from "@/lib/utils";

interface LeadScoreBadgeProps {
  score: number;
}

/**
 * Displays a color-coded lead score indicator.
 * Green >= 70, Yellow >= 40, Red < 40.
 */
export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  const colorClass =
    score >= 70
      ? "text-green-400"
      : score >= 40
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <span className={cn("text-sm font-mono font-medium", colorClass)}>
      {score}
    </span>
  );
}
