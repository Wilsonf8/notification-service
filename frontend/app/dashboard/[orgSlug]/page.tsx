/**
 * Dashboard overview page for an organization.
 * Displays summary stats and recent activity.
 * @module app/dashboard/[orgSlug]/page
 */
"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { IconFolder, IconPlus, IconAlertTriangle } from "@tabler/icons-react";
import { getOrganizationProjects } from "@/lib/api";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useTierLimits } from "@/lib/hooks/use-tier-limits";
import type { Project } from "@/lib/types";

/** Dashboard statistics */
interface Stats {
  totalProjects: number;
}

/** Page params containing the org slug */
interface OverviewPageProps {
  params: Promise<{ orgSlug: string }>;
}

/**
 * Main dashboard overview page for an organization.
 * Shows key metrics and quick actions for the user.
 *
 * @param props - Component props
 * @param props.params - Route params with orgSlug
 */
export default function OverviewPage({ params }: OverviewPageProps) {
  const { orgSlug } = use(params);
  const { currentOrg, isLoading: orgLoading } = useOrganization();
  const { limits } = useTierLimits(orgSlug);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Use orgSlug from URL directly to avoid race conditions
      const projects = await getOrganizationProjects(orgSlug);
      setRecentProjects(projects.slice(0, 5));
      setStats({
        totalProjects: projects.length,
      });
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    // Only fetch when org context is loaded and matches URL
    if (!orgLoading && currentOrg?.slug === orgSlug) {
      fetchData();
    }
  }, [orgLoading, currentOrg?.slug, orgSlug, fetchData]);

  if (orgLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentOrg && !currentOrg.isPersonal && limits && !limits.orgActive && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <IconAlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Set up billing to activate this organization
              </p>
              <p className="text-xs text-muted-foreground">
                Your team needs an active subscription to create projects, invite members, and more.
              </p>
            </div>
            <Link href={`/dashboard/${orgSlug}/billing`}>
              <Button size="sm">Set Up Billing</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to LiveConnect. Manage your customer engagement projects.
        </p>
      </div>

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <IconFolder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProjects === 0
                ? "Create your first project to get started"
                : `${stats.totalProjects} active project${stats.totalProjects !== 1 ? "s" : ""}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/${orgSlug}/projects`}>
              <Button className="gap-2" size="sm">
                <IconPlus className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Projects</CardTitle>
          <Link href={`/dashboard/${orgSlug}/projects`}>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <IconFolder className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No projects yet
              </p>
              <Link href={`/dashboard/${orgSlug}/projects`}>
                <Button className="mt-4 gap-2" size="sm">
                  <IconPlus className="h-4 w-4" />
                  Create Project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/${orgSlug}/projects/${project.id}`}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
