/**
 * Dashboard sidebar navigation component.
 * Displays the main navigation links for the dashboard.
 * @module components/dashboard/sidebar
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconFolder,
  IconSettings,
  IconUsersGroup,
  IconBook,
} from "@tabler/icons-react";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";

/** Navigation item configuration */
interface NavItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Tabler icon component */
  icon: React.ComponentType<{ className?: string }>;
}

/** Main navigation items for the dashboard */
export const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: IconFolder,
  },
  {
    label: "Docs",
    href: "/dashboard/docs",
    icon: IconBook,
  },
  {
    label: "Team",
    href: "/dashboard/team",
    icon: IconUsersGroup,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: IconSettings,
  },
];

/**
 * Checks if a nav item should be marked as active based on current pathname.
 * @param href - The nav item's href
 * @param pathname - The current pathname
 * @returns True if the item is active
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(href);
}

/**
 * Sidebar navigation for the dashboard.
 * Highlights the active route and provides links to all dashboard sections.
 * Hidden on mobile viewports (use MobileNav in header instead).
 */
export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-semibold text-sidebar-foreground">
            NotifyKit
          </span>
        </Link>
      </div>
      <div className="border-b border-border py-2">
        <OrgSwitcher />
      </div>
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
