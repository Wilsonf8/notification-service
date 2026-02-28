/**
 * Documentation header component with mobile navigation.
 * Displays at the top of all documentation pages.
 * Includes a hamburger menu for mobile navigation.
 * @module components/docs/docs-header
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { IconMenu2, IconArrowLeft } from "@tabler/icons-react";
import { docsNavItems, isDocsNavItemActive } from "@/components/docs/docs-sidebar";

/**
 * Documentation header with mobile navigation drawer.
 * Provides a hamburger menu on mobile devices to access navigation.
 */
export function DocsHeader() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

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
                  href="/"
                  className="flex items-center gap-2"
                  onClick={() => setSheetOpen(false)}
                >
                  <IconArrowLeft className="h-4 w-4" />
                  <span className="text-sm">Back to Hooman</span>
                </Link>
              </SheetTitle>
            </SheetHeader>
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

        {/* Title - visible on mobile */}
        <span className="text-sm font-medium md:hidden">Documentation</span>
      </div>

      {/* Desktop: show current page title or empty space */}
      <div className="hidden md:block" />
    </header>
  );
}
