/**
 * Project default page — Live Users.
 * @module app/dashboard/p/[projectId]/page
 */
"use client";

import { useProject } from "./layout";
import { LiveUsersPanel } from "@/components/liveconnect/live-users-panel";

/**
 * Project default page component.
 * Renders the LiveConnect Live Users panel.
 */
export default function ProjectPage() {
  const { projectId, isAdmin } = useProject();

  return <LiveUsersPanel projectId={projectId} isAdmin={isAdmin} />;
}
