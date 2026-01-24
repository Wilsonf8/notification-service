/**
 * Application-wide providers for theme and other global context.
 * Wraps the entire application in the root layout.
 * @module components/providers
 */
"use client";

import { ThemeProvider } from "next-themes";

/** Props for the Providers component */
interface ProvidersProps {
  /** Child components to wrap with providers */
  children: React.ReactNode;
}

/**
 * Root providers component that wraps the application with necessary context providers.
 * Currently provides:
 * - ThemeProvider: Dark/light mode support with dark as default
 *
 * @param props - Component props
 * @param props.children - Child components to render within providers
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
