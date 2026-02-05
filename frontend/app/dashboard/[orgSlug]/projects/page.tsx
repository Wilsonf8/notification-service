/**
 * Projects list page.
 * Displays all projects for the current organization.
 * @module app/dashboard/[orgSlug]/projects/page
 */
"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus, IconFolder, IconVideo } from "@tabler/icons-react";
import { getOrganizationProjects, createOrganizationProject } from "@/lib/api";
import { useOrganization } from "@/lib/contexts/organization-context";
import type { Project } from "@/lib/types";

/** Page params containing the org slug */
interface ProjectsPageProps {
  params: Promise<{ orgSlug: string }>;
}

/**
 * Projects list page component.
 * Shows all projects belonging to the current organization.
 * Provides UI to create new projects.
 *
 * @param props - Component props
 * @param props.params - Route params with orgSlug
 */
export default function ProjectsPage({ params }: ProjectsPageProps) {
  const { orgSlug } = use(params);
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  /**
   * Fetches projects from the API for the current organization.
   */
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Use orgSlug from URL directly to avoid race conditions
      const data = await getOrganizationProjects(orgSlug);
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  /**
   * Handles creating a new project in the current organization.
   */
  const handleCreate = async () => {
    if (!newProjectName.trim()) return;

    try {
      setCreating(true);
      // Use orgSlug from URL directly
      const project = await createOrganizationProject(orgSlug, {
        name: newProjectName.trim(),
        type: "LIVECONNECT",
      });
      setProjects((prev) => [...prev, project]);
      setNewProjectName("");
      setIsCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    // Only fetch when org context is loaded and matches URL
    if (!orgLoading && currentOrg?.slug === orgSlug) {
      fetchProjects();
    }
  }, [orgLoading, currentOrg?.slug, orgSlug, fetchProjects]);

  if (orgLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your LiveConnect projects
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
            <IconPlus className="h-4 w-4" />
            New Project
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Create a new LiveConnect project for real-time customer engagement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="My Project"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !newProjectName.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <IconFolder className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Create your first LiveConnect project to start engaging with customers.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setIsCreateOpen(true)}>
              <IconPlus className="h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/${orgSlug}/projects/${project.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <IconVideo className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>
                    LiveConnect · Created {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
