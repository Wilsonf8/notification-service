/**
 * Project settings page.
 * Allows editing project name, managing tags, and deleting the project.
 * @module app/dashboard/p/[projectId]/settings/page
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconTrash } from "@tabler/icons-react";
import { useProject } from "../layout";
import { updateProject, deleteProject } from "@/lib/api";
import { TagManagement } from "@/components/liveconnect/crm/tag-management";

/**
 * Project settings page component.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { project, projectId, isAdmin, refreshProject } = useProject();

  const [projectName, setProjectName] = useState(project.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Saves project settings.
   */
  const handleSave = async () => {
    if (!projectName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await updateProject(projectId, { name: projectName.trim() });
      await refreshProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Deletes the project and redirects to dashboard.
   */
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await deleteProject(projectId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
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

      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>Configure your project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving || !projectName.trim()}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>CRM Tags</CardTitle>
            <CardDescription>
              Define tags to categorize and organize visitors in your CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagManagement projectId={projectId} />
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all its data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              <IconTrash className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
