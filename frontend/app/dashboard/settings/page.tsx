/**
 * User settings page.
 * Allows users to manage their account settings including account deletion.
 * @module app/dashboard/settings/page
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCurrentUser,
  updateProfile,
  deletionPreflight,
  deleteAccount,
} from "@/lib/api";
import { removeToken } from "@/lib/auth";
import type { DeletionPreflightResponse } from "@/lib/api/account";
import type { User } from "@/lib/types";
import { IconAlertTriangle, IconLoader2, IconPencil, IconCheck, IconX } from "@tabler/icons-react";

/**
 * User settings page component.
 * Displays account information and account deletion with preflight checks.
 */
export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Deletion flow state
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightResult, setPreflightResult] =
    useState<DeletionPreflightResponse | null>(null);
  const [showBlockersDialog, setShowBlockersDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getCurrentUser();
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  /**
   * Enters edit mode with current values pre-filled.
   */
  const handleEditClick = () => {
    setEditFirstName(user?.firstName || "");
    setEditLastName(user?.lastName || "");
    setSaveError(null);
    setEditing(true);
  };

  /**
   * Saves the updated profile and exits edit mode.
   */
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile(
        editFirstName.trim() || null,
        editLastName.trim() || null
      );
      setUser(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Runs the preflight check and shows either the blockers dialog
   * or the confirmation dialog depending on the result.
   */
  const handleDeleteClick = async () => {
    setPreflightLoading(true);
    setDeleteError(null);
    try {
      const result = await deletionPreflight();
      setPreflightResult(result);
      if (result.canDelete) {
        setShowConfirmDialog(true);
      } else {
        setShowBlockersDialog(true);
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to check deletion eligibility"
      );
    } finally {
      setPreflightLoading(false);
    }
  };

  /**
   * Performs the actual account deletion after confirmation.
   */
  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      removeToken();
      router.push("/login");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete account"
      );
      setDeleting(false);
    }
  };

  const confirmPhrase = "delete my account";
  const canConfirm = confirmText.toLowerCase() === confirmPhrase;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              <IconPencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {editing ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {editFirstName.charAt(0).toUpperCase() ||
                      user?.username?.charAt(0).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium">First Name</p>
                      <Input
                        id="firstName"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="First name"
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Last Name</p>
                      <Input
                        id="lastName"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Last name"
                        maxLength={50}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Username</p>
                <p className="text-sm text-muted-foreground">
                  {user?.username || "Unknown"}
                </p>
              </div>
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <IconLoader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <IconCheck className="h-4 w-4 mr-1" />
                  )}
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  <IconX className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {user?.firstName?.charAt(0).toUpperCase() ||
                      user?.username?.charAt(0).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.username || "User"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || "No email"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Username</p>
                <p className="text-sm text-muted-foreground">
                  {user?.username || "Unknown"}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Your account will be deactivated for 30 days, then permanently
                deleted along with all your personal projects and data.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={preflightLoading}
              className="shrink-0 ml-4"
            >
              {preflightLoading && (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Account
            </Button>
          </div>
          {deleteError && (
            <p className="mt-2 text-sm text-destructive">{deleteError}</p>
          )}
        </CardContent>
      </Card>

      {/* Blockers Dialog */}
      <Dialog open={showBlockersDialog} onOpenChange={setShowBlockersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-4 w-4 text-destructive" />
              Cannot Delete Account
            </DialogTitle>
            <DialogDescription>
              You must transfer ownership of the following organizations before
              deleting your account:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {preflightResult?.blockers.map((blocker) => (
              <li
                key={blocker.organizationId}
                className="flex items-center justify-between bg-muted px-3 py-2 text-xs"
              >
                <span className="font-medium">{blocker.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowBlockersDialog(false);
                    router.push(
                      `/dashboard/${blocker.slug}/team`
                    );
                  }}
                >
                  Manage Team
                </Button>
              </li>
            ))}
          </ul>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          setShowConfirmDialog(open);
          if (!open) {
            setConfirmText("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-4 w-4 text-destructive" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This will immediately remove you from all team organizations and
              deactivate your account. After 30 days, your personal organization,
              projects, and all associated data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted p-3 text-xs space-y-1">
              <p className="font-medium">What will happen:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>Your personal organization and projects will be deleted</li>
                <li>You will be removed from all team organizations</li>
                <li>Your team CRM data (notes, tags) will be preserved anonymously</li>
                <li>Pending invitations will be revoked</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Type <span className="font-mono font-medium text-foreground">{confirmPhrase}</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmPhrase}
                autoComplete="off"
              />
            </div>
          </div>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!canConfirm || deleting}
            >
              {deleting && (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              )}
              {deleting ? "Deleting..." : "Permanently Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
