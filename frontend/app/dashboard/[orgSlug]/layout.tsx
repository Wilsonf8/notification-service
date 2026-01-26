/**
 * Organization-scoped layout for dashboard pages.
 * Validates the org slug from URL and syncs with organization context.
 * @module app/dashboard/[orgSlug]/layout
 */
"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/lib/contexts/organization-context";
import { Skeleton } from "@/components/ui/skeleton";

/** Props for the org-scoped layout */
interface OrgLayoutProps {
  /** Route parameters containing the organization slug */
  params: Promise<{ orgSlug: string }>;
  /** Child page content */
  children: React.ReactNode;
}

/**
 * Layout component for organization-scoped dashboard pages.
 * Validates the org slug and syncs with the organization context.
 * Redirects to /dashboard if the org is invalid.
 *
 * @param props - Component props
 * @param props.params - Route params with orgSlug
 * @param props.children - Child page content
 */
export default function OrgLayout({ params, children }: OrgLayoutProps) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const { organizations, currentOrg, isLoading, switchOrg } = useOrganization();

  useEffect(() => {
    if (isLoading) return;

    // Find the org matching the URL slug
    const matchingOrg = organizations.find((o) => o.slug === orgSlug);

    if (!matchingOrg) {
      // Invalid slug - redirect to dashboard (which will redirect to default org)
      router.replace("/dashboard");
      return;
    }

    // If URL org differs from context org, sync context to URL
    if (currentOrg?.slug !== orgSlug) {
      switchOrg(orgSlug);
    }
  }, [orgSlug, organizations, currentOrg, isLoading, switchOrg, router]);

  // Show loading state while fetching orgs
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Check if org is valid before rendering children
  const isValidOrg = organizations.some((o) => o.slug === orgSlug);
  if (!isValidOrg) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return <>{children}</>;
}
