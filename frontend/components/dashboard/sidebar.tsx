/**
 * Dashboard sidebar navigation component.
 * Dual-mode: project mode shows project nav items, org mode shows org nav items.
 * @module components/dashboard/sidebar
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconUsers,
  IconMessageCircle,
  IconAddressBook,
  IconUserCog,
  IconCode,
  IconPalette,
  IconSettings,
  IconUsersGroup,
  IconCreditCard,
  IconChevronLeft,
} from "@tabler/icons-react";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useProjectContext } from "@/lib/contexts/project-context";

/** Navigation item configuration */
interface NavItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Tabler icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Only show for admin/owner roles */
  adminOnly?: boolean;
}

/**
 * Generates project-scoped navigation items.
 * @param projectId - The current project ID
 * @param isAdmin - Whether the user is admin/owner
 * @returns Array of navigation items for project mode
 */
export function getProjectNavItems(projectId: string, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { label: "Live Users", href: `/dashboard/p/${projectId}`, icon: IconUsers },
    { label: "Conversations", href: `/dashboard/p/${projectId}/conversations`, icon: IconMessageCircle },
    { label: "CRM", href: `/dashboard/p/${projectId}/crm`, icon: IconAddressBook },
    { label: "Reps", href: `/dashboard/p/${projectId}/reps`, icon: IconUserCog, adminOnly: true },
    { label: "Embed", href: `/dashboard/p/${projectId}/embed`, icon: IconCode },
    { label: "Widget", href: `/dashboard/p/${projectId}/widget`, icon: IconPalette },
    { label: "Settings", href: `/dashboard/p/${projectId}/settings`, icon: IconSettings },
  ];

  return items.filter((item) => !item.adminOnly || isAdmin);
}

/**
 * Generates org-scoped navigation items.
 * @param orgSlug - The current organization slug
 * @param userRole - The current user's role
 * @returns Array of navigation items for org mode
 */
export function getOrgNavItems(orgSlug: string, userRole?: string): NavItem[] {
  const items: NavItem[] = [
    { label: "Team", href: `/dashboard/o/${orgSlug}/team`, icon: IconUsersGroup },
  ];

  if (userRole === "OWNER") {
    items.push({
      label: "Billing",
      href: `/dashboard/o/${orgSlug}/billing`,
      icon: IconCreditCard,
    });
  }

  items.push({
    label: "Settings",
    href: `/dashboard/o/${orgSlug}/settings`,
    icon: IconSettings,
  });

  return items;
}

/**
 * Checks if a nav item should be marked as active based on current pathname.
 * @param href - The nav item's href
 * @param pathname - The current pathname
 * @returns True if the item is active
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  // For project default page (Live Users), exact match only
  const projectDefaultMatch = href.match(/^\/dashboard\/p\/[^/]+$/);
  if (projectDefaultMatch) {
    return pathname === href;
  }

  // For user settings, exact match
  if (href === "/dashboard/settings") {
    return pathname.startsWith(href);
  }

  // For other routes, use startsWith
  return pathname.startsWith(href);
}

/**
 * Detects the current sidebar mode from the pathname.
 * @param pathname - The current pathname
 * @returns "project" | "org" | "other"
 */
function getSidebarMode(pathname: string): "project" | "org" | "other" {
  if (pathname.startsWith("/dashboard/p/")) return "project";
  if (pathname.startsWith("/dashboard/o/")) return "org";
  return "other";
}

/**
 * Extracts the org slug from an org-mode URL.
 * @param pathname - The current pathname
 * @returns The org slug or null
 */
function getOrgSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/o\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Sidebar navigation for the dashboard.
 * Dual-mode: project mode with ProjectSwitcher + project nav,
 * org mode with "Back to Project" + org nav.
 * Hidden on mobile viewports (use MobileNav in header instead).
 */
export function DashboardSidebar() {
  const pathname = usePathname();
  const { currentOrg, organizations } = useOrganization();
  const { currentProject } = useProjectContext();

  const mode = getSidebarMode(pathname);

  // Determine admin status
  const isAdmin = currentOrg?.userRole === "OWNER" || currentOrg?.userRole === "ADMIN";

  // Get nav items based on mode
  let navItems: NavItem[] = [];
  if (mode === "project" && currentProject) {
    navItems = getProjectNavItems(currentProject.id, isAdmin);
  } else if (mode === "org") {
    const orgSlug = getOrgSlugFromPath(pathname);
    if (orgSlug) {
      const org = organizations.find((o) => o.slug === orgSlug);
      navItems = getOrgNavItems(orgSlug, org?.userRole || currentOrg?.userRole);
    }
  } else if (currentProject) {
    // On /dashboard or /dashboard/settings, show project nav
    navItems = getProjectNavItems(currentProject.id, isAdmin);
  }

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-semibold text-sidebar-foreground">
            LiveConnect
          </span>
        </Link>
      </div>

      {/* Mode-specific header */}
      {mode === "org" ? (
        <div className="border-b border-border py-2">
          <Link
            href={currentProject ? `/dashboard/p/${currentProject.id}` : "/dashboard"}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <IconChevronLeft className="h-4 w-4" />
            <span>Back to Project</span>
          </Link>
        </div>
      ) : (
        <div className="border-b border-border py-2">
          <ProjectSwitcher />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item.href, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
