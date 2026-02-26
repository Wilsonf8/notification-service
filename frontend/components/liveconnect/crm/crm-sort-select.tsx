/**
 * Sort field and direction selector for CRM visitor list.
 * @module components/liveconnect/crm/crm-sort-select
 */

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import type { CrmSortField } from "@/lib/types";

/** Sort option definition */
const SORT_OPTIONS: { label: string; value: CrmSortField }[] = [
  { label: "Last Seen", value: "lastSeenAt" },
  { label: "Lead Score", value: "leadScore" },
  { label: "Name", value: "name" },
  { label: "Last Call", value: "lastCallAt" },
];

interface CrmSortSelectProps {
  sort: CrmSortField;
  direction: "asc" | "desc";
  onSortChange: (sort: CrmSortField) => void;
  onDirectionChange: (direction: "asc" | "desc") => void;
}

/**
 * Dropdown for selecting the sort field with a direction toggle button.
 * @param sort - Current sort field
 * @param direction - Current sort direction
 * @param onSortChange - Called when sort field changes
 * @param onDirectionChange - Called when direction is toggled
 */
export function CrmSortSelect({
  sort,
  direction,
  onSortChange,
  onDirectionChange,
}: CrmSortSelectProps) {
  return (
    <div className="flex items-center gap-1">
      <Select
        value={sort}
        onValueChange={(val) => onSortChange(val as CrmSortField)}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDirectionChange(direction === "asc" ? "desc" : "asc")}
        className="h-7 w-7 p-0"
      >
        {direction === "asc" ? (
          <IconSortAscending className="h-3.5 w-3.5" />
        ) : (
          <IconSortDescending className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
