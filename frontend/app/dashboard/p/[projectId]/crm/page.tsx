/**
 * CRM visitor list page.
 * Shows all visitors with filtering, search, and pagination.
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
import { getCrmVisitors } from "@/lib/api/liveconnect-crm";
import { CrmVisitorList } from "@/components/liveconnect/crm/crm-visitor-list";
import { CrmTimeFilter } from "@/components/liveconnect/crm/crm-time-filter";
import type { CrmVisitorListItem } from "@/lib/types";

/** Page size for pagination */
const PAGE_SIZE = 20;

/**
 * CRM visitor list page component.
 */
export default function CrmPage() {
  const { projectId } = useProject();
  const router = useRouter();

  const [visitors, setVisitors] = useState<CrmVisitorListItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState(7);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);

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
        sort: "lastSeenAt",
        direction: "desc",
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
  }, [projectId, days, search, page]);

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
