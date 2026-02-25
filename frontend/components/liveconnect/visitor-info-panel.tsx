/**
 * Shared visitor info panel with editable contact fields and CRM notes.
 * Supports two variants: "sidebar" (call popup) and "card" (CRM detail page).
 * @module components/liveconnect/visitor-info-panel
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconUser,
  IconMail,
  IconPhone,
  IconX,
  IconSend,
  IconTrash,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react";
import {
  getCrmVisitorDetail,
  updateVisitorContact,
  getVisitorNotes,
  addVisitorNote,
  deleteVisitorNote,
} from "@/lib/api/liveconnect-crm";
import type { CrmVisitorDetail, VisitorNote } from "@/lib/types";

/** Props for the VisitorInfoPanel */
interface VisitorInfoPanelProps {
  projectId: string;
  visitorId: string;
  variant: "sidebar" | "card";
  onClose?: () => void;
}

/** Save status for auto-save indicator */
type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Props for the AutoSaveInput sub-component.
 */
interface AutoSaveInputProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onSave: (value: string) => Promise<void>;
}

/**
 * TODO(human): Implement the AutoSaveInput component.
 *
 * This component renders a single contact field (name, email, or phone)
 * that auto-saves when the user blurs out of the input.
 *
 * It should:
 * 1. Maintain local state for the input value (initialized from `value` prop)
 * 2. Track a SaveStatus ("idle" | "saving" | "saved" | "error")
 * 3. On blur: if the local value differs from the original `value` prop,
 *    call `onSave(localValue)` and update the status accordingly
 * 4. Show a status indicator to the right of the input:
 *    - saving: spinning IconLoader2
 *    - saved: green IconCheck (auto-clear back to idle after 2 seconds)
 *    - error: red text "Failed"
 * 5. Sync local state when the `value` prop changes externally
 *
 * Render structure:
 *   <div className="flex items-center gap-2">
 *     {icon}                        ← the Tabler icon passed in
 *     <Input ... />                 ← the editable field
 *     {status indicator}            ← saving/saved/error feedback
 *   </div>
 */
function AutoSaveInput({ icon, placeholder, value, onSave }: AutoSaveInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Sync local state when parent updates the value prop externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  /**
   * On blur, saves the field if the value has changed.
   */
  const handleBlur = async () => {
    if (localValue === value) return;
    try {
      setStatus("saving");
      await onSave(localValue);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <Input
        placeholder={placeholder}
        value={localValue}
        className="h-8 text-sm"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
      />
      {status === "saving" && (
        <IconLoader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      )}
      {status === "saved" && (
        <IconCheck className="h-3.5 w-3.5 shrink-0 text-green-500" />
      )}
      {status === "error" && (
        <span className="shrink-0 text-xs text-destructive">Failed</span>
      )}
    </div>
  );
}

/**
 * Formats date for note display.
 */
function formatNoteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Shared visitor info panel with auto-save contact fields and inline notes.
 */
export function VisitorInfoPanel({
  projectId,
  visitorId,
  variant,
  onClose,
}: VisitorInfoPanelProps) {
  const [visitor, setVisitor] = useState<CrmVisitorDetail | null>(null);
  const [notes, setNotes] = useState<VisitorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  /**
   * Fetches visitor detail and notes in parallel.
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [visitorData, notesData] = await Promise.all([
        getCrmVisitorDetail(projectId, visitorId),
        getVisitorNotes(projectId, visitorId),
      ]);
      setVisitor(visitorData);
      setNotes(notesData.content);
    } catch (err) {
      console.error("[VisitorInfoPanel] Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, visitorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Saves a single contact field via PATCH.
   * @param field - The field name to update
   * @param value - The new value
   */
  const handleSaveField = async (field: "name" | "email" | "phone", value: string) => {
    await updateVisitorContact(projectId, visitorId, { [field]: value });
    setVisitor((prev) => prev ? { ...prev, [field]: value || null } : prev);
  };

  /**
   * Adds a new note to the visitor.
   */
  const handleAddNote = async () => {
    if (!newNote.trim() || addingNote) return;
    try {
      setAddingNote(true);
      const note = await addVisitorNote(projectId, visitorId, newNote.trim());
      setNotes((prev) => [note, ...prev]);
      setNewNote("");
    } catch (err) {
      console.error("[VisitorInfoPanel] Failed to add note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  /**
   * Deletes a note by ID.
   */
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteVisitorNote(projectId, visitorId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error("[VisitorInfoPanel] Failed to delete note:", err);
    }
  };

  // ---- Content (shared between variants) ----

  const content = loading ? (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  ) : !visitor ? (
    <div className="p-4 text-center text-sm text-muted-foreground">
      Visitor not found
    </div>
  ) : (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Contact Fields */}
      <div className="space-y-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Contact
        </p>
        <AutoSaveInput
          icon={<IconUser className="h-4 w-4" />}
          placeholder="Name"
          value={visitor.name || ""}
          onSave={(val) => handleSaveField("name", val)}
        />
        <AutoSaveInput
          icon={<IconMail className="h-4 w-4" />}
          placeholder="Email"
          value={visitor.email || ""}
          onSave={(val) => handleSaveField("email", val)}
        />
        <AutoSaveInput
          icon={<IconPhone className="h-4 w-4" />}
          placeholder="Phone"
          value={visitor.phone || ""}
          onSave={(val) => handleSaveField("phone", val)}
        />
      </div>

      {/* Notes Section */}
      <div className="flex flex-1 flex-col overflow-hidden border-t border-border">
        <div className="p-4 pb-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Notes
          </p>
        </div>

        {/* Add note form */}
        <div className="flex gap-2 px-4 pb-3">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAddNote();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleAddNote}
            disabled={!newNote.trim() || addingNote}
            className="shrink-0 self-end"
          >
            <IconSend className="h-4 w-4" />
          </Button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {notes.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No notes yet.
            </p>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <IconTrash className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.authorName} · {formatNoteDate(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ---- Variant wrappers ----

  if (variant === "sidebar") {
    return (
      <div className="flex h-full w-full flex-col border-l border-border bg-background sm:w-80">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Visitor Info</span>
          {onClose && (
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <IconX className="h-4 w-4" />
            </Button>
          )}
        </div>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Visitor Info</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}