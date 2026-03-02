"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Routes where the LiveConnect widget should be visible. */
const ALLOWED_ROUTES = ["/", "/login", "/docs"];

/**
 * Checks whether the widget should be visible on the given pathname.
 * Matches exact routes in ALLOWED_ROUTES and any sub-paths of `/docs`.
 * @param pathname - The current pathname from Next.js router
 * @returns Whether the widget should be shown
 */
function isWidgetRoute(pathname: string): boolean {
  return (
    ALLOWED_ROUTES.includes(pathname) || pathname.startsWith("/docs/")
  );
}

/**
 * Renders the LiveConnect widget script and toggles its visibility
 * based on the current route. The widget is only shown on `/`, `/login`,
 * and `/docs/*` pages.
 */
export function LiveConnectDemo() {
  const pathname = usePathname();

  useEffect(() => {
    const visible = isWidgetRoute(pathname);

    function applyVisibility() {
      const el = document.getElementById("liveconnect-widget");
      if (el) {
        el.style.display = visible ? "" : "none";
        return true;
      }
      return false;
    }

    // The widget element may not exist yet on first render (async script).
    // Poll briefly until it appears.
    if (applyVisibility()) return;

    const interval = setInterval(() => {
      if (applyVisibility()) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <Script
      src="https://hooman.live/sdk/liveconnect.js"
      data-key="lck_1GALKoQhjpNQg9uqUCLdKZ7eegLVipNUQQPy2iQ-Msw"
      strategy="afterInteractive"
    />
  );
}
