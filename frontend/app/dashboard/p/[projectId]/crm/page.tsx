/**
 * CRM visitor list page.
 * Shows all visitors with filtering, search, sorting, and pagination.
 * @module app/dashboard/p/[projectId]/crm/page
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconChevronLeft, IconChevronRight, IconSearch } from "@tabler/icons-react";
import { useProject } from "../layout";
import { getCrmVisitors, getProjectTags } from "@/lib/api/liveconnect-crm";
import { CrmVisitorList } from "@/components/liveconnect/crm/crm-visitor-list";
import { CrmTimeFilter } from "@/components/liveconnect/crm/crm-time-filter";
import { CrmStageFilter } from "@/components/liveconnect/crm/crm-stage-filter";
import { CrmTagFilter } from "@/components/liveconnect/crm/crm-tag-filter";
import { CrmBooleanFilters, type BooleanFilterState } from "@/components/liveconnect/crm/crm-boolean-filters";
import { CrmSortSelect } from "@/components/liveconnect/crm/crm-sort-select";
import type { CrmVisitorListItem, CrmSortField, PipelineStage, Tag } from "@/lib/types";

/** Page size for pagination */
const PAGE_SIZE = 20;

/** Default boolean filter state (all off) */
const DEFAULT_BOOLEAN_FILTERS: BooleanFilterState = {
  hasBeenInCall: false,
  hasContactForm: false,
  hasContactInfo: false,
  repUpdatedInfo: false,
  onlineNow: false,
};

/** Valid sort field values for localStorage validation */
const VALID_SORT_FIELDS: CrmSortField[] = ["lastSeenAt", "leadScore", "name", "lastCallAt"];

/**
 * Safely parses a JSON string, returning fallback on failure.
 * @param value - Raw string from localStorage
 * @param fallback - Default value if parsing fails
 * @returns Parsed value or fallback
 */
function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * CRM visitor list page component.
 */
export default function CrmPage() {
  const { projectId } = useProject();
  const router = useRouter();

  // Data state
  const [visitors, setVisitors] = useState<CrmVisitorListItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [days, setDays] = useState(() => {
    if (typeof window === "undefined") return 7;
    const saved = localStorage.getItem(`crm-days-${projectId}`);
    return saved ? Number(saved) : 7;
  });
  const [stages, setStages] = useState<PipelineStage[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParse(localStorage.getItem(`crm-stages-${projectId}`), []);
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParse(localStorage.getItem(`crm-tagIds-${projectId}`), []);
  });
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilterState>(() => {
    if (typeof window === "undefined") return DEFAULT_BOOLEAN_FILTERS;
    return { ...DEFAULT_BOOLEAN_FILTERS, ...safeParse(localStorage.getItem(`crm-boolFilters-${projectId}`), {}) };
  });
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);

  // Sort state
  const [sort, setSort] = useState<CrmSortField>(() => {
    if (typeof window === "undefined") return "lastSeenAt";
    const saved = localStorage.getItem(`crm-sort-${projectId}`);
    return saved && VALID_SORT_FIELDS.includes(saved as CrmSortField)
      ? (saved as CrmSortField)
      : "lastSeenAt";
  });
  const [direction, setDirection] = useState<"asc" | "desc">(() => {
    if (typeof window === "undefined") return "desc";
    const saved = localStorage.getItem(`crm-direction-${projectId}`);
    return saved === "asc" || saved === "desc" ? saved : "desc";
  });

  /**
   * Fetches CRM visitors from the API.
   */
  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCrmVisitors(projectId, {
        page,
        size: PAGE_SIZE,
        days,
        search: search || undefined,
        stages: stages.length ? stages : undefined,
        tagIds: selectedTagIds.length ? selectedTagIds : undefined,
        hasBeenInCall: booleanFilters.hasBeenInCall || undefined,
        hasContactForm: booleanFilters.hasContactForm || undefined,
        hasContactInfo: booleanFilters.hasContactInfo || undefined,
        repUpdatedInfo: booleanFilters.repUpdatedInfo || undefined,
        onlineNow: booleanFilters.onlineNow || undefined,
        sort,
        direction,
      });
      setVisitors(response.visitors);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visitors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [projectId, days, search, stages, selectedTagIds, booleanFilters, sort, direction, page]);

  // Fetch project tags on mount and validate persisted tagIds
  useEffect(() => {
    getProjectTags(projectId).then((tags) => {
      setProjectTags(tags);
      const validIds = new Set(tags.map((t) => t.id));
      setSelectedTagIds((prev) => prev.filter((id) => validIds.has(id)));
    }).catch(() => {});
  }, [projectId]);

  /**
   * Handles search form submission.
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  /**
   * Handles time filter change.
   */
  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    setPage(0);
    localStorage.setItem(`crm-days-${projectId}`, String(newDays));
  };

  /**
   * Handles stage filter change.
   */
  const handleStagesChange = (newStages: PipelineStage[]) => {
    setStages(newStages);
    setPage(0);
    localStorage.setItem(`crm-stages-${projectId}`, JSON.stringify(newStages));
  };

  /**
   * Handles tag filter change.
   */
  const handleTagsChange = (newTagIds: string[]) => {
    setSelectedTagIds(newTagIds);
    setPage(0);
    localStorage.setItem(`crm-tagIds-${projectId}`, JSON.stringify(newTagIds));
  };

  /**
   * Handles boolean filter change.
   */
  const handleBooleanFiltersChange = (newFilters: BooleanFilterState) => {
    setBooleanFilters(newFilters);
    setPage(0);
    localStorage.setItem(`crm-boolFilters-${projectId}`, JSON.stringify(newFilters));
  };

  /**
   * Handles sort field change.
   */
  const handleSortChange = (newSort: CrmSortField) => {
    setSort(newSort);
    setPage(0);
    localStorage.setItem(`crm-sort-${projectId}`, newSort);
  };

  /**
   * Handles sort direction change.
   */
  const handleDirectionChange = (newDirection: "asc" | "desc") => {
    setDirection(newDirection);
    setPage(0);
    localStorage.setItem(`crm-direction-${projectId}`, newDirection);
  };

  /**
   * Navigates to visitor detail page.
   */
  const handleVisitorSelect = (visitorId: string) => {
    router.push(`/dashboard/p/${projectId}/crm/${visitorId}`);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>CRM</CardTitle>
              <CardDescription>
                {totalElements} visitor{totalElements !== 1 ? "s" : ""} in the last {days} day{days !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <CrmTimeFilter value={days} onChange={handleDaysChange} />
          </div>

          {/* Stage + Tag filters */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CrmStageFilter value={stages} onChange={handleStagesChange} />
            {projectTags.length > 0 && (
              <CrmTagFilter tags={projectTags} value={selectedTagIds} onChange={handleTagsChange} />
            )}
            <div className="ml-auto">
              <CrmSortSelect
                sort={sort}
                direction={direction}
                onSortChange={handleSortChange}
                onDirectionChange={handleDirectionChange}
              />
            </div>
          </div>

          {/* Boolean filters */}
          <div className="mt-3">
            <CrmBooleanFilters value={booleanFilters} onChange={handleBooleanFiltersChange} />
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or location..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" size="default">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <CrmVisitorList
            visitors={visitors}
            loading={loading}
            onSelect={handleVisitorSelect}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <IconChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <IconChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
