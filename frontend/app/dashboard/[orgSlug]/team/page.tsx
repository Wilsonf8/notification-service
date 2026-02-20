/**
 * Team settings page.
 * Allows organization owners and admins to manage team members.
 * @module app/dashboard/[orgSlug]/team/page
 */
"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconUserPlus,
  IconTrash,
  IconDoorExit,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useOrganization } from "@/lib/contexts/organization-context";
import {
  getOrganizationMembers,
  addMemberByUsername,
  updateMemberRole,
  removeMember,
  leaveOrganization,
  deleteOrganization,
  updateOrganization,
} from "@/lib/api/organizations";
import type { OrganizationMember, OrgRole } from "@/lib/types";

/** Page params containing the org slug */
interface TeamPageProps {
  params: Promise<{ orgSlug: string }>;
}

/**
 * Team settings page component.
 * Displays team members and provides management controls.
 *
 * @param props - Component props
 * @param props.params - Route params with orgSlug
 */
export default function TeamPage({ params }: TeamPageProps) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const { currentOrg, isLoading: orgLoading, refreshOrgs } = useOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<OrgRole>("MEMBER");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit org name state
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete org state
  const [deleting, setDeleting] = useState(false);

  // Leave org state
  const [leaving, setLeaving] = useState(false);

  const isOwner = currentOrg?.userRole === "OWNER";
  const isAdmin = currentOrg?.userRole === "ADMIN";
  const canManageMembers = isOwner || isAdmin;

  /**
   * Fetches members from the API.
   */
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Use orgSlug from URL directly to avoid race conditions
      const data = await getOrganizationMembers(orgSlug);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    // Only fetch when org context is loaded and matches URL
    if (!orgLoading && currentOrg?.slug === orgSlug) {
      fetchMembers();
    }
  }, [orgLoading, currentOrg?.slug, orgSlug, fetchMembers]);

  /**
   * Handles adding a new member.
   */
  const handleAddMember = async () => {
    if (!newUsername.trim()) return;

    try {
      setAdding(true);
      setAddError(null);
      // Use orgSlug from URL directly
      const member = await addMemberByUsername(orgSlug, {
        username: newUsername.trim(),
        role: newRole,
      });
      setMembers((prev) => [...prev, member]);
      setNewUsername("");
      setNewRole("MEMBER");
      setIsAddOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  /**
   * Handles updating a member's role.
   */
  const handleRoleChange = async (memberId: string, role: OrgRole) => {
    try {
      // Use orgSlug from URL directly
      const updated = await updateMemberRole(orgSlug, memberId, { role });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? updated : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  /**
   * Handles removing a member.
   */
  const handleRemoveMember = async (memberId: string) => {
    try {
      // Use orgSlug from URL directly
      await removeMember(orgSlug, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  /**
   * Handles leaving the organization.
   */
  const handleLeave = async () => {
    try {
      setLeaving(true);
      // Use orgSlug from URL directly
      await leaveOrganization(orgSlug);
      await refreshOrgs();
      // Redirect to dashboard - let it handle finding the new default org
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave organization");
      setLeaving(false);
    }
  };

  /**
   * Handles deleting the organization.
   */
  const handleDelete = async () => {
    try {
      setDeleting(true);
      // Use orgSlug from URL directly
      await deleteOrganization(orgSlug);
      await refreshOrgs();
      // Redirect to dashboard - let it handle finding the new default org
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization");
      setDeleting(false);
    }
  };

  /**
   * Handles updating the organization name.
   */
  const handleUpdateName = async () => {
    if (!editedName.trim()) return;

    try {
      setSaving(true);
      // Use orgSlug from URL directly
      await updateOrganization(orgSlug, { name: editedName.trim() });
      await refreshOrgs();
      setIsEditNameOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Gets the badge variant for a role.
   */
  const getRoleBadgeVariant = (role: OrgRole) => {
    switch (role) {
      case "OWNER":
        return "default";
      case "ADMIN":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-muted-foreground">No organization selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {currentOrg.isPersonal ? (
            <IconUser className="h-8 w-8 text-muted-foreground" />
          ) : (
            <IconUsers className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">{currentOrg.name}</h1>
            <p className="text-muted-foreground">
              {currentOrg.isPersonal ? "Personal workspace" : "Team workspace"}
            </p>
          </div>
        </div>
        {canManageMembers && !currentOrg.isPersonal && (
          <Button
            variant="outline"
            onClick={() => {
              setEditedName(currentOrg.name);
              setIsEditNameOpen(true);
            }}
          >
            Edit Name
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? "s" : ""} in this{" "}
              {currentOrg.isPersonal ? "workspace" : "team"}
            </CardDescription>
          </div>
          {canManageMembers && !currentOrg.isPersonal && (
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <IconUserPlus className="h-4 w-4" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                {canManageMembers && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(member.firstName || member.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.username}
                        </p>
                        {member.email && (
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner && member.role !== "OWNER" ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleRoleChange(member.id, value as OrgRole)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </TableCell>
                  {canManageMembers && (
                    <TableCell>
                      {member.role !== "OWNER" && (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="icon-sm">
                                <IconTrash className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.username}{" "}
                                from the team? They will lose access to all
                                projects.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!currentOrg.isPersonal && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isOwner && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">Leave Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Remove yourself from this organization
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="outline" className="gap-2" disabled={leaving}>
                        <IconDoorExit className="h-4 w-4" />
                        {leaving ? "Leaving..." : "Leave"}
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave organization</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to leave {currentOrg.name}? You
                        will lose access to all projects.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleLeave}
                      >
                        Leave
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {isOwner && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">Delete Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this organization and all its projects
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="destructive" disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete Organization"}
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete organization</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {currentOrg.name}? This
                        action cannot be undone and will permanently delete all
                        projects and data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Add an existing user to this team by their username.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as OrgRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={handleAddMember}
              disabled={adding || !newUsername.trim()}
            >
              {adding ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit organization name</DialogTitle>
            <DialogDescription>
              Change the display name for this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editedName.trim()) {
                    handleUpdateName();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={handleUpdateName}
              disabled={saving || !editedName.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
