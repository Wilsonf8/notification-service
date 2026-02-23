/**
 * Tag management component for project settings.
 * Allows admins to create, edit, and delete tag definitions.
 * @module components/liveconnect/crm/tag-management
 */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus, IconTrash, IconPencil, IconCheck, IconX } from "@tabler/icons-react";
import { getProjectTags, createTag, updateTag, deleteTag } from "@/lib/api/liveconnect-crm";
import type { Tag } from "@/lib/types";

/** Predefined color options for tags */
const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

interface TagManagementProps {
  projectId: string;
}

/**
 * Admin component for managing project tag definitions.
 */
export function TagManagement({ projectId }: TagManagementProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const data = await getProjectTags(projectId);
      setTags(data);
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [projectId]);

  /**
   * Creates a new tag definition.
   */
  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    try {
      setCreating(true);
      await createTag(projectId, newName.trim(), newColor);
      setNewName("");
      setNewColor(TAG_COLORS[0]);
      setShowCreate(false);
      fetchTags();
    } catch {
      // silently handled
    } finally {
      setCreating(false);
    }
  };

  /**
   * Starts editing a tag.
   */
  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  /**
   * Saves tag edit.
   */
  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || saving) return;
    try {
      setSaving(true);
      await updateTag(projectId, editingId, editName.trim(), editColor);
      setEditingId(null);
      fetchTags();
    } catch {
      // silently handled
    } finally {
      setSaving(false);
    }
  };

  /**
   * Deletes a tag definition.
   */
  const handleDelete = async (tagId: string) => {
    if (!confirm("Delete this tag? It will be removed from all visitors.")) return;
    try {
      await deleteTag(projectId, tagId);
      fetchTags();
    } catch {
      // silently handled
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tag list */}
      {tags.length === 0 && !showCreate && (
        <p className="text-sm text-muted-foreground">
          No tags defined yet. Create one to start categorizing visitors.
        </p>
      )}

      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex items-center justify-between border border-border p-2.5"
        >
          {editingId === tag.id ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <ColorPicker value={editColor} onChange={setEditColor} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
              >
                <IconCheck className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditingId(null)}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm">{tag.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => startEdit(tag)}
                >
                  <IconPencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDelete(tag.id)}
                >
                  <IconTrash className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Create form */}
      {showCreate ? (
        <div className="space-y-3 border border-border p-3">
          <div className="space-y-2">
            <Label htmlFor="tagName">Tag Name</Label>
            <Input
              id="tagName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. VIP, Follow Up, Hot Lead"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreate(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              size="sm"
            >
              {creating ? "Creating..." : "Create Tag"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
          className="gap-1.5"
        >
          <IconPlus className="h-4 w-4" />
          Add Tag
        </Button>
      )}
    </div>
  );
}

/** Color picker props */
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * Simple color swatch picker.
 */
function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-1">
      {TAG_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className="h-5 w-5 transition-transform"
          style={{
            backgroundColor: color,
            outline: value === color ? "2px solid currentColor" : "none",
            outlineOffset: "2px",
          }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
