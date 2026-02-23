/**
 * Next.js middleware for URL redirects.
 * Handles old URL patterns and redirects to new flat URL structure.
 * @module middleware
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Redirects old dashboard URLs to the new flat URL structure.
 * - /dashboard/[orgSlug]/projects/[projectId]/* -> /dashboard/p/[projectId]/*
 * - /dashboard/[orgSlug]/team -> /dashboard/o/[orgSlug]/team
 * - /dashboard/[orgSlug]/billing -> /dashboard/o/[orgSlug]/billing
 *
 * @param request - The incoming request
 * @returns A redirect response or continues to the next handler
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip new URL patterns, settings, and static assets
  if (
    pathname.startsWith("/dashboard/p/") ||
    pathname.startsWith("/dashboard/o/") ||
    pathname === "/dashboard" ||
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/settings/") ||
    !pathname.startsWith("/dashboard/")
  ) {
    return NextResponse.next();
  }

  // Match: /dashboard/[orgSlug]/projects/[projectId]/...
  const projectMatch = pathname.match(
    /^\/dashboard\/([^/]+)\/projects\/([^/]+)(\/.*)?$/
  );
  if (projectMatch) {
    const projectId = projectMatch[2];
    const restOfPath = projectMatch[3] || "";
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard/p/${projectId}${restOfPath}`;
    return NextResponse.redirect(url, 308);
  }

  // Match: /dashboard/[orgSlug]/team
  const teamMatch = pathname.match(/^\/dashboard\/([^/]+)\/team$/);
  if (teamMatch) {
    const orgSlug = teamMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard/o/${orgSlug}/team`;
    return NextResponse.redirect(url, 308);
  }

  // Match: /dashboard/[orgSlug]/billing
  const billingMatch = pathname.match(/^\/dashboard\/([^/]+)\/billing$/);
  if (billingMatch) {
    const orgSlug = billingMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard/o/${orgSlug}/billing`;
    return NextResponse.redirect(url, 308);
  }

  // Match: /dashboard/[orgSlug]/settings
  const settingsMatch = pathname.match(/^\/dashboard\/([^/]+)\/settings$/);
  if (settingsMatch) {
    const orgSlug = settingsMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard/o/${orgSlug}/settings`;
    return NextResponse.redirect(url, 308);
  }

  // Match: /dashboard/[orgSlug]/projects (projects list -> redirect to dashboard)
  const projectsListMatch = pathname.match(/^\/dashboard\/([^/]+)\/projects$/);
  if (projectsListMatch) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url, 308);
  }

  // Match: /dashboard/[orgSlug] (org overview -> redirect to dashboard)
  const orgOverviewMatch = pathname.match(/^\/dashboard\/([^/]+)$/);
  if (orgOverviewMatch) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
