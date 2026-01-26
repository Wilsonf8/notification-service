/**
 * Dashboard redirect page.
 * Redirects to the user's default organization dashboard.
 * @module app/dashboard/page
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/lib/contexts/organization-context";
import { Skeleton } from "@/components/ui/skeleton";

/** Key used for storing the current organization slug in localStorage */
const CURRENT_ORG_KEY = "currentOrgSlug";

/**
 * Dashboard root page that redirects to the default organization.
 * Uses localStorage preference or falls back to personal org.
 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  const { organizations, isLoading } = useOrganization();

  useEffect(() => {
    if (isLoading || organizations.length === 0) return;

    // Try to restore saved organization from localStorage
    const savedSlug = localStorage.getItem(CURRENT_ORG_KEY);
    const savedOrg = savedSlug
      ? organizations.find((o) => o.slug === savedSlug)
      : null;

    if (savedOrg) {
      router.replace(`/dashboard/${savedOrg.slug}`);
      return;
    }

    // Default to personal org
    const personalOrg = organizations.find((o) => o.isPersonal);
    if (personalOrg) {
      router.replace(`/dashboard/${personalOrg.slug}`);
      return;
    }

    // Fallback to first org if no personal org
    if (organizations.length > 0) {
      router.replace(`/dashboard/${organizations[0].slug}`);
    }
  }, [organizations, isLoading, router]);

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
