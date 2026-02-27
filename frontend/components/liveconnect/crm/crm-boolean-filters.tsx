/**
 * Boolean toggle filters for CRM visitor list.
 * Each filter is a toggle button that enables/disables a boolean query parameter.
 * @module components/liveconnect/crm/crm-boolean-filters
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  IconPhone,
  IconMail,
  IconAddressBook,
  IconUserEdit,
  IconWifi,
} from "@tabler/icons-react";

/** Boolean filter definition */
interface BooleanFilterOption {
  key: string;
  label: string;
  icon: React.ElementType;
}

/** Available boolean filter options */
const FILTER_OPTIONS: BooleanFilterOption[] = [
  { key: "hasBeenInCall", label: "Been in Call", icon: IconPhone },
  { key: "hasContactForm", label: "Contact Form", icon: IconMail },
  { key: "hasContactInfo", label: "Has Contact Info", icon: IconAddressBook },
  { key: "repUpdatedInfo", label: "Rep Updated", icon: IconUserEdit },
  { key: "onlineNow", label: "Online Now", icon: IconWifi },
];

/** Map of active boolean filter keys */
export type BooleanFilterState = Record<string, boolean>;

interface CrmBooleanFiltersProps {
  value: BooleanFilterState;
  onChange: (filters: BooleanFilterState) => void;
}

/**
 * Toggle button group for boolean CRM filters.
 * Clicking a button toggles its boolean state on/off.
 * @param value - Current filter state
 * @param onChange - Called with updated filter state on toggle
 */
export function CrmBooleanFilters({ value, onChange }: CrmBooleanFiltersProps) {
  const toggle = (key: string) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="flex flex-wrap gap-1">
      {FILTER_OPTIONS.map((option) => {
        const active = !!value[option.key];
        const Icon = option.icon;
        return (
          <Button
            key={option.key}
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => toggle(option.key)}
            className={cn("gap-1.5")}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
