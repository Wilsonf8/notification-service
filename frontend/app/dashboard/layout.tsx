/**
 * Dashboard layout with sidebar navigation.
 * Wraps all dashboard pages with consistent navigation and header.
 * @module app/dashboard/layout
 */
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

/** Props for the dashboard layout */
interface DashboardLayoutProps {
  /** Child page content to render in the main area */
  children: React.ReactNode;
}

/**
 * Root layout for all dashboard pages.
 * Provides a consistent sidebar, header, and main content area.
 *
 * @param props - Component props
 * @param props.children - The page content to render
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
