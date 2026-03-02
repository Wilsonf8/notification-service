"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCRIPT_ID = "liveconnect-demo-script";
const SCRIPT_SRC = "https://hooman.live/sdk/liveconnect.js";
const DATA_KEY = "lck_1GALKoQhjpNQg9uqUCLdKZ7eegLVipNUQQPy2iQ-Msw";

/**
 * Checks if the given pathname should display the LiveConnect widget.
 * Allowed routes: `/`, `/login`, and `/docs/*`.
 * @param pathname - The current route pathname
 * @returns Whether the widget should be shown
 */
function isAllowedRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/")
  );
}

/**
 * Client component that conditionally injects the LiveConnect widget script
 * on public-facing pages only (/, /login, /docs/*).
 * Removes the script and widget DOM elements when navigating away.
 */
export function LiveConnectDemo() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isAllowedRoute(pathname)) return;

    // Avoid injecting duplicate scripts
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.setAttribute("data-key", DATA_KEY);
    document.body.appendChild(script);

    return () => {
      // Remove the script tag
      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript) {
        existingScript.remove();
      }

      // Remove the widget's shadow DOM host element
      const widgetHost = document.getElementById("liveconnect-widget");
      if (widgetHost) {
        widgetHost.remove();
      }
    };
  }, [pathname]);

  return null;
}
