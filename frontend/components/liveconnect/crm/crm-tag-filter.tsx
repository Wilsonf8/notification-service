/**
 * Tag dropdown multi-select filter for CRM list.
 * Uses AND logic — visitor must have ALL selected tags.
 * @module components/liveconnect/crm/crm-tag-filter
 */

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconTag } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";

interface CrmTagFilterProps {
  tags: Tag[];
  value: string[];
  onChange: (tagIds: string[]) => void;
}

/**
 * Dropdown multi-select filter for tags.
 * @param tags - Available project tags
 * @param value - Currently selected tag IDs
 * @param onChange - Called with updated tag ID array on toggle
 */
export function CrmTagFilter({ tags, value, onChange }: CrmTagFilterProps) {
  const toggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 border border-input bg-background px-3 py-1.5 text-sm font-medium",
            "hover:bg-accent hover:text-accent-foreground cursor-pointer"
          )}
        >
          <IconTag className="h-4 w-4" />
          Tags
          {value.length > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center bg-primary text-primary-foreground text-xs font-medium">
              {value.length}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {tags.map((tag) => (
          <DropdownMenuCheckboxItem
            key={tag.id}
            checked={value.includes(tag.id)}
            onCheckedChange={() => toggle(tag.id)}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
        {value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={() => onChange([])}
            >
              Clear all
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
