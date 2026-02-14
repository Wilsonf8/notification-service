/**
 * Documentation index page.
 * Redirects to the Getting Started page.
 * @module app/docs/page
 */

import { redirect } from "next/navigation";

/**
 * Redirects to the Getting Started documentation page.
 */
export default function DocsPage() {
  redirect("/docs/getting-started");
}
