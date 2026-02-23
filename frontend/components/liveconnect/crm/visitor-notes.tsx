/**
 * Notes section for CRM visitors.
 * @module components/liveconnect/crm/visitor-notes
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTrash, IconSend } from "@tabler/icons-react";
import {
  getVisitorNotes,
  addVisitorNote,
  deleteVisitorNote,
} from "@/lib/api/liveconnect-crm";
import type { VisitorNote } from "@/lib/types";

interface VisitorNotesProps {
  projectId: string;
  visitorId: string;
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
 * Displays notes with add/delete functionality.
 */
export function VisitorNotes({ projectId, visitorId }: VisitorNotesProps) {
  const [notes, setNotes] = useState<VisitorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await getVisitorNotes(projectId, visitorId);
      setNotes(response.content);
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [projectId, visitorId]);

  const handleAddNote = async () => {
    if (!newNote.trim() || adding) return;
    try {
      setAdding(true);
      await addVisitorNote(projectId, visitorId, newNote.trim());
      setNewNote("");
      fetchNotes();
    } catch {
      // silently handled
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteVisitorNote(projectId, visitorId, noteId);
      fetchNotes();
    } catch {
      // silently handled
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add note form */}
        <div className="mb-4 flex gap-2">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAddNote();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleAddNote}
            disabled={!newNote.trim() || adding}
            className="shrink-0 self-end"
          >
            <IconSend className="h-4 w-4" />
          </Button>
        </div>

        {/* Notes list */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : notes.length === 0 ? (
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
                    onClick={() => handleDelete(note.id)}
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
      </CardContent>
    </Card>
  );
}
