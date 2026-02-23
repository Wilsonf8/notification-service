/**
 * Organization-scoped layout for /dashboard/o/[orgSlug] routes.
 * Validates the org slug and syncs with organization context.
 * @module app/dashboard/o/[orgSlug]/layout
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
 * Layout component for organization-scoped pages.
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

    const matchingOrg = organizations.find((o) => o.slug === orgSlug);

    if (!matchingOrg) {
      router.replace("/dashboard");
      return;
    }

    // Sync context to URL org if needed
    if (currentOrg?.slug !== orgSlug) {
      // Directly update context without navigation (we're already on the right page)
      const org = organizations.find((o) => o.slug === orgSlug);
      if (org) {
        switchOrg(orgSlug);
      }
    }
  }, [orgSlug, organizations, currentOrg, isLoading, switchOrg, router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

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
