/**
 * Dashboard layout with sidebar navigation.
 * Wraps all dashboard pages with consistent navigation and header.
 * @module app/dashboard/layout
 */
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { OrganizationProvider } from "@/lib/contexts/organization-context";
import { ProjectProvider } from "@/lib/contexts/project-context";
import { TourProvider } from "@/lib/tour/tour-context";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { TourPopover } from "@/components/tour/tour-popover";

/** Props for the dashboard layout */
interface DashboardLayoutProps {
  /** Child page content to render in the main area */
  children: React.ReactNode;
}

/**
 * Root layout for all dashboard pages.
 * Provides a consistent sidebar, header, and main content area.
 * Wraps content with OrganizationProvider and ProjectProvider.
 *
 * @param props - Component props
 * @param props.children - The page content to render
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <OrganizationProvider>
      <ProjectProvider>
        <TourProvider>
          <div className="flex min-h-screen">
            <DashboardSidebar />
            <div className="flex flex-1 flex-col">
              <DashboardHeader />
              <main className="flex-1 p-3 md:p-6" data-tour="main-content">{children}</main>
            </div>
          </div>
          <TourOverlay />
          <TourPopover />
        </TourProvider>
      </ProjectProvider>
    </OrganizationProvider>
  );
}
