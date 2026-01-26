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
import { IconFolder, IconSend, IconBrandTelegram, IconPlus } from "@tabler/icons-react";
import { getOrganizationProjects } from "@/lib/api";
import { useOrganization } from "@/lib/contexts/organization-context";
import type { Project } from "@/lib/types";

/** Dashboard statistics */
interface Stats {
  totalProjects: number;
  totalEvents: number;
  connectedChats: number;
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
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalEvents: 0,
    connectedChats: 0,
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
        totalEvents: 0, // TODO: Aggregate from project stats
        connectedChats: 0, // TODO: Aggregate from project stats
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
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to NotifyKit. Manage your notification projects.
        </p>
      </div>

      <div className="grid gap-3 md:gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Events Sent</CardTitle>
            <IconSend className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Total notifications sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connected Chats</CardTitle>
            <IconBrandTelegram className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.connectedChats}</div>
            <p className="text-xs text-muted-foreground">
              Telegram chats receiving notifications
            </p>
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
