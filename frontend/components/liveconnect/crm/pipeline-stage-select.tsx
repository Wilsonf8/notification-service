/**
 * Pipeline stage selector with visual indicators.
 * @module components/liveconnect/crm/pipeline-stage-select
 */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateVisitorStage } from "@/lib/api/liveconnect-crm";
import type { PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Stage configuration */
const STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: "NEW", label: "New", color: "bg-stone-500" },
  { value: "ENGAGED", label: "Engaged", color: "bg-blue-500" },
  { value: "WON", label: "Won", color: "bg-green-500" },
];

interface PipelineStageSelectProps {
  projectId: string;
  visitorId: string;
  currentStage: PipelineStage;
  /** Called with the new stage after a successful update. */
  onStageChange: (stage: PipelineStage) => void;
}

/**
 * Visual pipeline stage selector with clickable steps.
 */
export function PipelineStageSelect({
  projectId,
  visitorId,
  currentStage,
  onStageChange,
}: PipelineStageSelectProps) {
  const [updating, setUpdating] = useState(false);

  const handleStageChange = async (stage: PipelineStage) => {
    if (stage === currentStage || updating) return;
    try {
      setUpdating(true);
      await updateVisitorStage(projectId, visitorId, stage);
      onStageChange(stage);
    } catch {
      // Error handled by parent
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pipeline Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {STAGES.map((stage) => {
            const isActive = stage.value === currentStage;
            return (
              <button
                key={stage.value}
                onClick={() => handleStageChange(stage.value)}
                disabled={updating}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  updating && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "h-2.5 w-2.5 shrink-0",
                    isActive ? stage.color : "bg-muted-foreground/30"
                  )}
                />
                {stage.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
