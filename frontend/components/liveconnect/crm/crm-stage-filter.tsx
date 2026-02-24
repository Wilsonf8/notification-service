/**
 * Pipeline stage multi-select filter for CRM list.
 * @module components/liveconnect/crm/crm-stage-filter
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/lib/types";

/** Stage options with labels and dot colors */
const STAGE_OPTIONS: { label: string; value: PipelineStage; dotClass: string }[] = [
  { label: "New", value: "NEW", dotClass: "bg-stone-400" },
  { label: "Engaged", value: "ENGAGED", dotClass: "bg-blue-500" },
  { label: "Won", value: "WON", dotClass: "bg-green-500" },
];

interface CrmStageFilterProps {
  value: PipelineStage[];
  onChange: (stages: PipelineStage[]) => void;
}

/**
 * Multi-select button group for filtering by pipeline stage.
 * Empty selection means no filter (show all).
 * @param value - Currently selected stages
 * @param onChange - Called with updated stage array on toggle
 */
export function CrmStageFilter({ value, onChange }: CrmStageFilterProps) {
  const toggle = (stage: PipelineStage) => {
    if (value.includes(stage)) {
      onChange(value.filter((s) => s !== stage));
    } else {
      onChange([...value, stage]);
    }
  };

  return (
    <div className="flex gap-1">
      {STAGE_OPTIONS.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Button
            key={option.value}
            variant={selected ? "default" : "outline"}
            size="sm"
            onClick={() => toggle(option.value)}
            className={cn("min-w-[40px] gap-1.5")}
          >
            <span className={cn("h-2 w-2 rounded-full", option.dotClass)} />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
