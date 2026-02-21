/**
 * Organization switcher dropdown component.
 * Allows users to switch between organizations and create new teams.
 * @module components/dashboard/org-switcher
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/lib/contexts/organization-context";
import { createOrganization } from "@/lib/api/organizations";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
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
  IconUser,
  IconUsers,
  IconPlus,
  IconCheck,
} from "@tabler/icons-react";

/**
 * Organization switcher component for the sidebar.
 * Displays a dropdown with all user's organizations and option to create new teams.
 */
export function OrgSwitcher() {
  const router = useRouter();
  const { organizations, currentOrg, isLoading, switchOrg, refreshOrgs } =
    useOrganization();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles creating a new team organization.
   * After creation, navigates to the new team's dashboard.
   */
  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const newOrg = await createOrganization({ name: teamName.trim() });
      await refreshOrgs();
      // Navigate to billing page for subscription setup
      router.push(`/dashboard/${newOrg.slug}/billing`);
      setTeamName("");
      setIsCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading || !currentOrg) {
    return (
      <div className="flex h-10 items-center gap-2 px-3 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-pulse bg-muted" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
            "hover:bg-sidebar-accent text-sidebar-foreground",
            "outline-none focus:bg-sidebar-accent"
          )}
        >
          {currentOrg.isPersonal ? (
            <IconUser className="h-4 w-4 shrink-0" />
          ) : (
            <IconUsers className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1 truncate text-left font-medium">
            {currentOrg.name}
          </span>
          <IconSelector className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrg(org.slug)}
                className="gap-2"
              >
                {org.isPersonal ? (
                  <IconUser className="h-4 w-4" />
                ) : (
                  <IconUsers className="h-4 w-4" />
                )}
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === currentOrg.id && (
                  <IconCheck className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsCreateOpen(true)}
            className="gap-2"
          >
            <IconPlus className="h-4 w-4" />
            <span>Create Team</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
