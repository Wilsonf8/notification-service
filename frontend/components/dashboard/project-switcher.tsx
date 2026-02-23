/**
 * Project switcher component for the sidebar.
 * iOS-style popover showing organizations with nested projects.
 * @module components/dashboard/project-switcher
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IconSelector,
  IconCheck,
  IconChevronDown,
  IconSettings,
  IconPlus,
  IconUser,
  IconUsers,
  IconFolder,
} from "@tabler/icons-react";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useProjectContext } from "@/lib/contexts/project-context";
import { createOrganization } from "@/lib/api/organizations";

/**
 * Project switcher that shows all orgs with projects nested underneath.
 * Clicking a project navigates to /dashboard/p/[projectId].
 * Clicking the gear icon navigates to /dashboard/o/[orgSlug]/team.
 */
export function ProjectSwitcher() {
  const router = useRouter();
  const { organizations, refreshOrgs } = useOrganization();
  const { currentProject, projectsByOrg, isLoading, switchProject } = useProjectContext();

  const [open, setOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles creating a new team organization.
   */
  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const newOrg = await createOrganization({ name: teamName.trim() });
      await refreshOrgs();
      setTeamName("");
      setIsCreateOpen(false);
      setOpen(false);
      router.push(`/dashboard/o/${newOrg.slug}/billing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  /**
   * Handles selecting a project.
   */
  const handleSelectProject = (projectId: string) => {
    setOpen(false);
    switchProject(projectId);
  };

  /**
   * Handles clicking the gear icon for an org.
   */
  const handleOrgSettings = (orgSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    router.push(`/dashboard/o/${orgSlug}/team`);
  };

  if (isLoading) {
    return (
      <div className="flex h-10 items-center gap-2 px-3 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-pulse bg-muted" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
            "hover:bg-sidebar-accent text-sidebar-foreground",
            "outline-none focus:bg-sidebar-accent"
          )}
        >
          <IconFolder className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left font-medium">
            {currentProject?.name || "Select Project"}
          </span>
          <IconSelector className="h-4 w-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-64 p-0"
        >
          <div className="max-h-80 overflow-y-auto py-1">
            {organizations.map((org) => {
              const orgProjects = projectsByOrg.get(org.slug) || [];

              return (
                <Collapsible key={org.id} defaultOpen>
                  <div className="flex items-center justify-between px-2 py-1">
                    <CollapsibleTrigger
                      className={cn(
                        "flex flex-1 items-center gap-2 px-1 py-1 text-xs font-medium",
                        "text-muted-foreground hover:text-foreground transition-colors",
                        "outline-none"
                      )}
                    >
                      <IconChevronDown className="h-3 w-3 transition-transform -rotate-90 [[data-panel-open]_&]:rotate-0" />
                      {org.isPersonal ? (
                        <IconUser className="h-3.5 w-3.5" />
                      ) : (
                        <IconUsers className="h-3.5 w-3.5" />
                      )}
                      <span className="truncate">{org.name}</span>
                    </CollapsibleTrigger>
                    <button
                      type="button"
                      onClick={(e) => handleOrgSettings(org.slug, e)}
                      className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title="Organization settings"
                    >
                      <IconSettings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <CollapsibleContent>
                    <div className="pb-1">
                      {orgProjects.length === 0 ? (
                        <p className="px-4 py-2 text-xs text-muted-foreground">
                          No projects
                        </p>
                      ) : (
                        orgProjects.map((project) => {
                          const isCurrent = currentProject?.id === project.id;
                          return (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => handleSelectProject(project.id)}
                              className={cn(
                                "flex w-full items-center gap-2 px-4 py-1.5 text-sm transition-colors",
                                isCurrent
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                              )}
                            >
                              <span className="flex-1 truncate text-left">
                                {project.name}
                              </span>
                              {isCurrent && (
                                <IconCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          <div className="border-t border-border px-2 py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setIsCreateOpen(true);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <IconPlus className="h-4 w-4" />
              <span>Create Team</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
            <DialogDescription>
              Teams let you collaborate with others on projects. You&apos;ll need
              to set up billing ($10/mo) to activate your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                placeholder="My Team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && teamName.trim()) {
                    handleCreateTeam();
                  }
                }}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleCreateTeam} disabled={creating || !teamName.trim()}>
              {creating ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
