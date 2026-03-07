/**
 * Dashboard header component with user menu and mobile navigation.
 * Displays at the top of all dashboard pages.
 * Includes a hamburger menu for mobile navigation.
 * @module components/dashboard/header
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { removeToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IconLogout, IconUser, IconMenu2, IconChevronLeft } from "@tabler/icons-react";
import {
  getProjectNavItems,
  getOrgNavItems,
  isNavItemActive,
} from "@/components/dashboard/sidebar";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { TourLauncher } from "@/components/tour/tour-launcher";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useProjectContext } from "@/lib/contexts/project-context";
import type { User } from "@/lib/types";

/**
 * Dashboard header with user dropdown menu and mobile navigation.
 * Provides logout functionality, navigation to user settings, and a mobile drawer menu.
 */
export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { currentOrg, organizations } = useOrganization();
  const { currentProject } = useProjectContext();
  const [user, setUser] = useState<User | null>(null);

  // Close mobile sheet on navigation
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Detect sidebar mode from pathname
  const isOrgMode = pathname.startsWith("/dashboard/o/");
  const isProjectMode = pathname.startsWith("/dashboard/p/");

  // Determine admin status
  const isAdmin = currentOrg?.userRole === "OWNER" || currentOrg?.userRole === "ADMIN";

  // Get nav items based on mode
  let navItems: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [];
  if (isProjectMode && currentProject) {
    navItems = getProjectNavItems(currentProject.id, isAdmin);
  } else if (isOrgMode) {
    const orgSlugMatch = pathname.match(/^\/dashboard\/o\/([^/]+)/);
    const orgSlug = orgSlugMatch ? orgSlugMatch[1] : "";
    const org = organizations.find((o) => o.slug === orgSlug);
    navItems = getOrgNavItems(orgSlug, org?.userRole || currentOrg?.userRole);
  } else if (currentProject) {
    navItems = getProjectNavItems(currentProject.id, isAdmin);
  }

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => {});
  }, []);

  /**
   * Returns the display initial for the avatar.
   * @param user - The current user
   * @returns A single uppercase character
   */
  const getAvatarInitial = (user: User | null): string => {
    if (user?.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return "U";
  };

  /**
   * Handles user logout by clearing the token and redirecting to login.
   */
  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        {/* Mobile hamburger menu - only visible on mobile */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
              />
            }
          >
            <IconMenu2 className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b border-border px-4 py-4">
              <SheetTitle>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2"
                  onClick={() => setSheetOpen(false)}
                >
                  <span className="text-lg font-semibold">hooman.live</span>
                </Link>
              </SheetTitle>
            </SheetHeader>

            {/* Mode-specific header for mobile */}
            {isOrgMode ? (
              <div className="border-b border-border py-2">
                <Link
                  href={currentProject ? `/dashboard/p/${currentProject.id}` : "/dashboard"}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                    "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  onClick={() => setSheetOpen(false)}
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
                        onClick={() => setSheetOpen(false)}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <TourLauncher />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center outline-none" data-tour="user-menu">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getAvatarInitial(user)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <IconUser className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
