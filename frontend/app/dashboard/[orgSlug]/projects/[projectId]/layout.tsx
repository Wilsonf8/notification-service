/**
 * Project detail layout with route-based navigation tabs.
 * Provides project context and LiveConnect navigation.
 * @module app/dashboard/[orgSlug]/projects/[projectId]/layout
 */
"use client";

import { use, useEffect, useState, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconUsers,
  IconMessageCircle,
  IconUserCog,
  IconCode,
  IconPalette,
  IconSettings,
  IconChevronLeft,
} from "@tabler/icons-react";
import { getProject } from "@/lib/api";
import { useOrganization } from "@/lib/contexts/organization-context";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Project context value */
interface ProjectContextValue {
  project: Project;
  orgSlug: string;
  projectId: string;
  isAdmin: boolean;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

/**
 * Hook to access the project context.
 * Must be used within a ProjectLayout.
 */
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectLayout");
  }
  return context;
}

/** Navigation tab definition */
interface NavTab {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

/** LiveConnect navigation tabs */
const liveConnectTabs: NavTab[] = [
  { label: "Live Users", href: "", icon: IconUsers },
  { label: "Conversations", href: "/conversations", icon: IconMessageCircle },
  { label: "Reps", href: "/reps", icon: IconUserCog, adminOnly: true },
  { label: "Embed", href: "/embed", icon: IconCode },
  { label: "Widget", href: "/widget", icon: IconPalette },
  { label: "Settings", href: "/settings", icon: IconSettings },
];

/** Props for the project layout */
interface ProjectLayoutProps {
  params: Promise<{ orgSlug: string; projectId: string }>;
  children: React.ReactNode;
}

/**
 * Project layout component with LiveConnect navigation tabs.
 * Fetches project data and provides it to child pages via context.
 */
export default function ProjectLayout({ params, children }: ProjectLayoutProps) {
  const { orgSlug, projectId } = use(params);
  const pathname = usePathname();
  const { currentOrg } = useOrganization();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin or owner
  const isAdmin = currentOrg?.userRole === "OWNER" || currentOrg?.userRole === "ADMIN";

  // Base path for project navigation
  const basePath = `/dashboard/${orgSlug}/projects/${projectId}`;

  /**
   * Fetches project data from the API.
   */
  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProject(projectId);
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  /**
   * Checks if a tab is currently active based on the pathname.
   */
  const isTabActive = (tabHref: string): boolean => {
    const fullPath = basePath + tabHref;
    if (tabHref === "") {
      // Default tab is active only when exactly at basePath
      return pathname === basePath;
    }
    return pathname.startsWith(fullPath);
  };

  // Filter tabs based on admin status
  const visibleTabs = liveConnectTabs.filter((tab) => !tab.adminOnly || isAdmin);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-96" />
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
            href={`/dashboard/${orgSlug}/projects`}
            className="mt-4 inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <IconChevronLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProjectContext.Provider
      value={{
        project,
        orgSlug,
        projectId,
        isAdmin,
        refreshProject: fetchProject,
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/${orgSlug}/projects`}
            className="flex h-8 w-8 items-center justify-center hover:bg-muted"
          >
            <IconChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              LiveConnect - Real-time customer engagement
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="border-b border-border">
          <div className="-mb-px flex gap-1 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const active = isTabActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={basePath + tab.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Page Content */}
        {children}
      </div>
    </ProjectContext.Provider>
  );
}
