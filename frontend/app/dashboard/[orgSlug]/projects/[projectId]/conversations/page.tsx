/**
 * Conversations page showing conversation history.
 * @module app/dashboard/[orgSlug]/projects/[projectId]/conversations/page
 */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useProject } from "../layout";
import { getConversations } from "@/lib/api/liveconnect-dashboard";
import { ConversationList } from "@/components/liveconnect/conversation-list";
import { ConversationDetail } from "@/components/liveconnect/conversation-detail";
import type {
  LiveConnectConversation,
  ConversationStatus,
  ConversationType,
} from "@/lib/types";

/** Page size for pagination */
const PAGE_SIZE = 10;

/**
 * Conversations page component.
 */
export default function ConversationsPage() {
  const { projectId } = useProject();

  // Data state
  const [conversations, setConversations] = useState<LiveConnectConversation[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ConversationType | "all">("all");
  const [page, setPage] = useState(0);

  // Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * Fetches conversations from the API.
   */
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getConversations(projectId, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        page,
        size: PAGE_SIZE,
      });
      setConversations(response.content);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [projectId, statusFilter, typeFilter, page]);

  /**
   * Handles filter changes - reset to page 0.
   */
  const handleStatusChange = (value: ConversationStatus | "all" | null) => {
    if (value) {
      setStatusFilter(value);
      setPage(0);
      setSelectedId(null);
    }
  };

  const handleTypeChange = (value: ConversationType | "all" | null) => {
    if (value) {
      setTypeFilter(value);
      setPage(0);
      setSelectedId(null);
    }
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: Filters and list */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Conversations</CardTitle>
                  <CardDescription>
                    Past video calls and contact form submissions
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ENDED">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="VIDEO_CALL">Video Call</SelectItem>
                      <SelectItem value="CONTACT_FORM">Contact Form</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                loading={loading}
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

        {/* Right column: Conversation detail */}
        <div>
          <ConversationDetail
            conversationId={selectedId}
            projectId={projectId}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}
