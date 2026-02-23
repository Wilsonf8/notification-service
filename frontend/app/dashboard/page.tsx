/**
 * Dashboard redirect page.
 * Redirects to the user's last visited project or first available project.
 * @module app/dashboard/page
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectContext, getLastVisitedProjectId } from "@/lib/contexts/project-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconPlus } from "@tabler/icons-react";
import { useOrganization } from "@/lib/contexts/organization-context";
import { createProject } from "@/lib/api/projects";

/**
 * Dashboard root page that redirects to the last visited project.
 * Falls back to the first available project, or shows a create prompt.
 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  const { projects, isLoading: projectsLoading, refreshProjects } = useProjectContext();
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectsLoading || orgLoading) return;

    if (projects.length === 0) return; // Show create prompt

    // Try to restore last visited project
    const lastProjectId = getLastVisitedProjectId();
    const lastProject = lastProjectId
      ? projects.find((p) => p.id === lastProjectId)
      : null;

    if (lastProject) {
      router.replace(`/dashboard/p/${lastProject.id}`);
      return;
    }

    // Fallback to first project
    router.replace(`/dashboard/p/${projects[0].id}`);
  }, [projects, projectsLoading, orgLoading, router]);

  /**
   * Creates a new project and navigates to it.
   */
  const handleCreateProject = async () => {
    if (!currentOrg) return;

    try {
      setCreating(true);
      setError(null);
      const project = await createProject({ name: "My Project" });
      await refreshProjects();
      router.push(`/dashboard/p/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setCreating(false);
    }
  };

  // Show create prompt if no projects exist
  if (!projectsLoading && !orgLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Welcome to LiveConnect</CardTitle>
            <CardDescription>
              Create your first project to get started with real-time customer engagement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              onClick={handleCreateProject}
              disabled={creating}
              className="w-full gap-2"
            >
              <IconPlus className="h-4 w-4" />
              {creating ? "Creating..." : "Create Your First Project"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while determining redirect
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
