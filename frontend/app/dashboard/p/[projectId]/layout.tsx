/**
 * Project-scoped layout for the new flat URL structure.
 * Provides project context and syncs with organization context.
 * No horizontal tab navigation — tabs are in the sidebar.
 * @module app/dashboard/p/[projectId]/layout
 */
"use client";

import { use, useEffect, useState, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { IconChevronLeft } from "@tabler/icons-react";
import { getProject } from "@/lib/api";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useProjectContext } from "@/lib/contexts/project-context";
import type { Project } from "@/lib/types";

/** Project context value */
interface ProjectContextValue {
  /** The current project */
  project: Project;
  /** The organization slug this project belongs to */
  orgSlug: string;
  /** The project ID */
  projectId: string;
  /** Whether the current user is an admin or owner */
  isAdmin: boolean;
  /** Refreshes project data from the API */
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

/**
 * Hook to access the project context.
 * Must be used within a ProjectLayout.
 *
 * @returns The project context value
 * @throws {Error} If used outside of ProjectLayout
 */
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectLayout");
  }
  return context;
}

/** Props for the project layout */
interface ProjectLayoutProps {
  /** Route parameters containing the project ID */
  params: Promise<{ projectId: string }>;
  /** Child page content */
  children: React.ReactNode;
}

/**
 * Project layout component for /dashboard/p/[projectId] routes.
 * Fetches project data, syncs org context, and provides ProjectContext.
 *
 * @param props - Component props
 * @param props.params - Route params with projectId
 * @param props.children - Child page content
 */
export default function ProjectLayout({ params, children }: ProjectLayoutProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const { organizations, currentOrg, isLoading: orgLoading, switchOrg } = useOrganization();
  const { setCurrentProject } = useProjectContext();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin or owner
  const isAdmin = currentOrg?.userRole === "OWNER" || currentOrg?.userRole === "ADMIN";

  /**
   * Fetches project data from the API.
   */
  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProject(projectId);
      setProject(data);

      // Sync with project context
      setCurrentProject(data);

      // Sync org context if needed
      if (data.organizationSlug && currentOrg?.slug !== data.organizationSlug) {
        const matchingOrg = organizations.find((o) => o.slug === data.organizationSlug);
        if (matchingOrg) {
          switchOrg(data.organizationSlug);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId, setCurrentProject, currentOrg?.slug, organizations, switchOrg]);

  useEffect(() => {
    if (!orgLoading) {
      fetchProject();
    }
  }, [orgLoading, fetchProject]);

  if (loading || orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error || "Project not found"}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <IconChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProjectContext.Provider
      value={{
        project,
        orgSlug: project.organizationSlug,
        projectId,
        isAdmin,
        refreshProject: fetchProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
