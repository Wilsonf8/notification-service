/**
 * Time range filter button group for CRM list.
 * @module components/liveconnect/crm/crm-time-filter
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Available time range options */
const TIME_OPTIONS = [
  { label: "1d", value: 1 },
  { label: "3d", value: 3 },
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
];

interface CrmTimeFilterProps {
  value: number;
  onChange: (days: number) => void;
}

/**
 * Button group for selecting the time range filter.
 */
export function CrmTimeFilter({ value, onChange }: CrmTimeFilterProps) {
  return (
    <div className="flex gap-1">
      {TIME_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
          className={cn("min-w-[40px]")}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
