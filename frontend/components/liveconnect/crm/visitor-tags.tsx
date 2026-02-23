/**
 * Tag assignment component for CRM visitors.
 * @module components/liveconnect/crm/visitor-tags
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconX } from "@tabler/icons-react";
import {
  getProjectTags,
  addTagToVisitor,
  removeTagFromVisitor,
} from "@/lib/api/liveconnect-crm";
import type { Tag } from "@/lib/types";

interface VisitorTagsProps {
  projectId: string;
  visitorId: string;
  tags: Tag[];
  onUpdate: () => void;
}

/**
 * Displays visitor tags with add/remove functionality.
 */
export function VisitorTags({
  projectId,
  visitorId,
  tags,
  onUpdate,
}: VisitorTagsProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjectTags(projectId).then(setAllTags).catch(() => {});
  }, [projectId]);

  const availableTags = allTags.filter(
    (t) => !tags.some((assigned) => assigned.id === t.id)
  );

  const handleAdd = async (tagId: string) => {
    try {
      setLoading(true);
      await addTagToVisitor(projectId, visitorId, tagId);
      onUpdate();
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (tagId: string) => {
    try {
      setLoading(true);
      await removeTagFromVisitor(projectId, visitorId, tagId);
      onUpdate();
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tags</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags assigned</p>
          )}
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
              style={{ backgroundColor: tag.color + "20", color: tag.color }}
            >
              {tag.name}
              <button
                onClick={() => handleRemove(tag.id)}
                className="hover:opacity-70"
                disabled={loading}
              >
                <IconX className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Add tag dropdown */}
        {availableTags.length > 0 && (
          <Select
            onValueChange={(v) => { if (v) handleAdd(v); }}
            disabled={loading}
            value=""
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add tag..." />
            </SelectTrigger>
            <SelectContent>
              {availableTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}
