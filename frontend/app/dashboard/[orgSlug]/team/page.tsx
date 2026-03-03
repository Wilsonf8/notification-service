/**
 * Team settings page.
 * Allows organization owners and admins to manage team members and invitations.
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
  IconX,
  IconAlertTriangle,
  IconFolder,
  IconPlus,
  IconVideo,
  IconCrown,
} from "@tabler/icons-react";
import Link from "next/link";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useTierLimits } from "@/lib/hooks/use-tier-limits";
import {
  getOrganizationMembers,
  getOrganizationProjects,
  createOrganizationProject,
  updateMemberRole,
  removeMember,
  leaveOrganization,
  deleteOrganization,
  updateOrganization,
  transferOwnership,
} from "@/lib/api/organizations";
import {
  createInvitation,
  getOrgInvitations,
  revokeInvitation,
} from "@/lib/api/invitations";
import { UserSearchCombobox } from "@/components/dashboard/user-search-combobox";
import type {
  OrganizationMember,
  OrganizationInvitation,
  OrgRole,
  UserSearchResult,
  Project,
} from "@/lib/types";

/** Page params containing the org slug */
interface TeamPageProps {
  params: Promise<{ orgSlug: string }>;
}

/**
 * Team settings page component.
 * Displays team members, pending invitations, and provides management controls.
 *
 * @param props - Component props
 * @param props.params - Route params with orgSlug
 */
export default function TeamPage({ params }: TeamPageProps) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const { currentOrg, isLoading: orgLoading, refreshOrgs } = useOrganization();
  const { limits, refresh: refreshLimits } = useTierLimits(orgSlug);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite member state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [newRole, setNewRole] = useState<OrgRole>("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Edit org name state
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete org state
  const [deleting, setDeleting] = useState(false);

  // Leave org state
  const [leaving, setLeaving] = useState(false);

  // Transfer ownership state
  const [transferring, setTransferring] = useState(false);
  const [transferTarget, setTransferTarget] = useState<OrganizationMember | null>(null);

  const isOwner = currentOrg?.userRole === "OWNER";
  const isAdmin = currentOrg?.userRole === "ADMIN";
  const canManageMembers = isOwner || isAdmin;

  /**
   * Fetches members and invitations from the API.
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [membersData, invitationsData, projectsData] = await Promise.all([
        getOrganizationMembers(orgSlug),
        getOrgInvitations(orgSlug).catch(() => [] as OrganizationInvitation[]),
        getOrganizationProjects(orgSlug).catch(() => [] as Project[]),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    // Only fetch when org context is loaded and matches URL
    if (!orgLoading && currentOrg?.slug === orgSlug) {
      fetchData();
    }
  }, [orgLoading, currentOrg?.slug, orgSlug, fetchData]);

  /**
   * Handles inviting a new member.
   */
  const handleInviteMember = async () => {
    if (!selectedUser) return;

    try {
      setInviting(true);
      setInviteError(null);
      const invitation = await createInvitation(orgSlug, {
        userId: selectedUser.id,
        role: newRole,
      });
      setInvitations((prev) => [...prev, invitation]);
      setSelectedUser(null);
      setNewRole("MEMBER");
      setIsInviteOpen(false);
      refreshLimits();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  /**
   * Handles revoking an invitation.
   */
  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await revokeInvitation(orgSlug, invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation");
    }
  };

  /**
   * Handles updating a member's role.
   */
  const handleRoleChange = async (memberId: string, role: OrgRole) => {
    try {
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
      await leaveOrganization(orgSlug);
      await refreshOrgs();
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
      await deleteOrganization(orgSlug);
      await refreshOrgs();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization");
      setDeleting(false);
    }
  };

  /**
   * Handles transferring ownership to another member.
   */
  const handleTransferOwnership = async () => {
    if (!transferTarget) return;

    try {
      setTransferring(true);
      await transferOwnership(orgSlug, transferTarget.id);
      await refreshOrgs();
      await fetchData();
      setTransferTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  /**
   * Handles updating the organization name.
   */
  const handleUpdateName = async () => {
    if (!editedName.trim()) return;

    try {
      setSaving(true);
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
   * Handles creating a new project in the current organization.
   */
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      setCreatingProject(true);
      const project = await createOrganizationProject(orgSlug, {
        name: newProjectName.trim(),
        type: "LIVECONNECT",
      });
      setProjects((prev) => [...prev, project]);
      setNewProjectName("");
      setIsCreateProjectOpen(false);
      refreshLimits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreatingProject(false);
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

  const memberLimitReached = limits ? members.length + invitations.length >= limits.maxMembers : false;
  const projectLimitReached = limits ? projects.length >= limits.maxProjects : false;
  const isInactive = currentOrg && !currentOrg.isPersonal && limits && !limits.orgActive;

  return (
    <div className="space-y-6">
      {isInactive && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <IconAlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Set up billing to activate this organization
              </p>
              <p className="text-xs text-muted-foreground">
                Your team needs an active subscription to invite members.
              </p>
            </div>
            <a href={`/dashboard/o/${orgSlug}/billing`}>
              <Button size="sm">Set Up Billing</Button>
            </a>
          </CardContent>
        </Card>
      )}

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

      {/* Projects */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              {limits
                ? `${projects.length} / ${limits.maxProjects} projects`
                : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          {canManageMembers && (
            <Button
              onClick={() => setIsCreateProjectOpen(true)}
              className="gap-2"
              disabled={projectLimitReached || !!isInactive}
              title={projectLimitReached ? "Project limit reached" : undefined}
            >
              <IconPlus className="h-4 w-4" />
              New Project
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <IconFolder className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No projects yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/${orgSlug}/projects/${project.id}`}
                  className="flex items-center justify-between p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <IconVideo className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {limits && !currentOrg.isPersonal
                ? `${members.length} / ${limits.maxMembers} members`
                : `${members.length} member${members.length !== 1 ? "s" : ""} in this ${currentOrg.isPersonal ? "workspace" : "team"}`}
            </CardDescription>
          </div>
          {canManageMembers && !currentOrg.isPersonal && (
            <Button
              onClick={() => setIsInviteOpen(true)}
              className="gap-2"
              disabled={memberLimitReached || !!isInactive}
              title={memberLimitReached ? "Member limit reached" : undefined}
            >
              <IconUserPlus className="h-4 w-4" />
              Invite Member
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
                        <div className="flex items-center gap-1">
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Transfer ownership"
                              onClick={() => setTransferTarget(member)}
                            >
                              <IconCrown className="h-4 w-4 text-yellow-500" />
                            </Button>
                          )}
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
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations - visible to OWNER/ADMIN */}
      {canManageMembers && !currentOrg.isPersonal && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              {invitations.length} pending invitation{invitations.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Invited</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(invitation.inviteeFirstName || invitation.inviteeUsername)
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {invitation.inviteeFirstName && invitation.inviteeLastName
                              ? `${invitation.inviteeFirstName} ${invitation.inviteeLastName}`
                              : invitation.inviteeUsername}
                          </p>
                          {invitation.inviteeEmail && (
                            <p className="text-sm text-muted-foreground">
                              {invitation.inviteeEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <IconX className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke the invitation for{" "}
                              {invitation.inviteeUsername}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleRevokeInvitation(invitation.id)}
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Search for an existing user to invite to this team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>User</Label>
              {selectedUser ? (
                <div className="flex items-center justify-between border border-border p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {selectedUser.firstName && selectedUser.lastName
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : selectedUser.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{selectedUser.username}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <UserSearchCombobox
                  excludeOrgId={currentOrg?.id || ""}
                  onSelect={setSelectedUser}
                  disabled={inviting}
                />
              )}
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
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={handleInviteMember}
              disabled={inviting || !selectedUser}
            >
              {inviting ? "Inviting..." : "Invite Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new hooman.live project for real-time customer engagement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="My Project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProjectName.trim()) {
                    handleCreateProject();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={handleCreateProject}
              disabled={creatingProject || !newProjectName.trim()}
            >
              {creatingProject ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <AlertDialog open={!!transferTarget} onOpenChange={(open) => { if (!open) setTransferTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership</AlertDialogTitle>
            <AlertDialogDescription>
              Transfer ownership of <strong>{currentOrg.name}</strong> to{" "}
              <strong>{transferTarget?.username}</strong>? You will be demoted to
              Admin and will lose owner-level permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleTransferOwnership}
              disabled={transferring}
            >
              {transferring ? "Transferring..." : "Transfer Ownership"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
