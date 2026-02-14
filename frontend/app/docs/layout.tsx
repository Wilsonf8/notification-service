/**
 * Documentation layout with sidebar navigation.
 * Provides the structure for all documentation pages.
 * @module app/docs/layout
 */

import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsHeader } from "@/components/docs/docs-header";

/** Props for the documentation layout */
interface DocsLayoutProps {
  /** Page content */
  children: React.ReactNode;
}

/**
 * Layout for documentation pages.
 * Includes sidebar navigation on desktop and header with mobile nav.
 * This is a public layout - no authentication required.
 *
 * @param props - Layout props
 * @param props.children - Page content to render
 */
export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <DocsSidebar />
      <div className="flex flex-1 flex-col">
        <DocsHeader />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
