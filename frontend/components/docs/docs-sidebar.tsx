/**
 * Documentation sidebar navigation component.
 * Displays navigation links for all documentation sections.
 * @module components/docs/docs-sidebar
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconBook2,
  IconDownload,
  IconSettings,
  IconCode,
  IconBug,
  IconArrowLeft,
} from "@tabler/icons-react";

/** Navigation item configuration */
interface NavItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Tabler icon component */
  icon: React.ComponentType<{ className?: string }>;
}

/** Documentation navigation items */
export const docsNavItems: NavItem[] = [
  {
    label: "Getting Started",
    href: "/docs/getting-started",
    icon: IconBook2,
  },
  {
    label: "Installation",
    href: "/docs/installation",
    icon: IconDownload,
  },
  {
    label: "Configuration",
    href: "/docs/configuration",
    icon: IconSettings,
  },
  {
    label: "API Reference",
    href: "/docs/api-reference",
    icon: IconCode,
  },
  {
    label: "Troubleshooting",
    href: "/docs/troubleshooting",
    icon: IconBug,
  },
];

/**
 * Checks if a nav item should be marked as active based on current pathname.
 * @param href - The nav item's href
 * @param pathname - The current pathname
 * @returns True if the item is active
 */
export function isDocsNavItemActive(href: string, pathname: string): boolean {
  return pathname.startsWith(href);
}

/**
 * Sidebar navigation for the documentation pages.
 * Highlights the active route and provides links to all documentation sections.
 * Hidden on mobile viewports (use mobile nav in header instead).
 */
export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2 text-sidebar-foreground hover:text-primary transition-colors">
          <IconArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to LiveConnect</span>
        </Link>
      </div>
      <div className="border-b border-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documentation
        </span>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {docsNavItems.map((item) => {
            const Icon = item.icon;
            const active = isDocsNavItemActive(item.href, pathname);
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
