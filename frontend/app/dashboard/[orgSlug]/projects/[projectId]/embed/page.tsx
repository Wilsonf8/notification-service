/**
 * Embed keys management page for LiveConnect projects.
 * @module app/dashboard/[orgSlug]/projects/[projectId]/embed/page
 */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  IconPlus,
  IconPencil,
  IconTrash,
  IconCopy,
  IconCode,
  IconAlertTriangle,
  IconCreditCard,
} from "@tabler/icons-react";
import Link from "next/link";
import { CodeBlock } from "@/components/dashboard/docs/code-block";
import { useProject } from "../layout";
import {
  getLiveConnectEmbedKeys,
  createLiveConnectEmbedKey,
  updateLiveConnectEmbedKey,
  deleteLiveConnectEmbedKey,
  getSubscriptionStatus,
} from "@/lib/api";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useTierLimits } from "@/lib/hooks/use-tier-limits";
import type {
  LiveConnectEmbedKey,
  LiveConnectEmbedKeyCreated,
  Subscription,
} from "@/lib/types";

/**
 * Embed keys management page component.
 */
export default function EmbedPage() {
  const { projectId, orgSlug } = useProject();
  const { currentOrg } = useOrganization();
  const { limits, refresh: refreshLimits } = useTierLimits(orgSlug);

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Embed keys state
  const [embedKeys, setEmbedKeys] = useState<LiveConnectEmbedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [embedKeyName, setEmbedKeyName] = useState("");
  const [embedKeyDomains, setEmbedKeyDomains] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit dialog state
  const [editingKey, setEditingKey] = useState<LiveConnectEmbedKey | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Success dialog state (shows full key)
  const [newEmbedKey, setNewEmbedKey] = useState<LiveConnectEmbedKeyCreated | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Script modal state
  const [scriptModalKey, setScriptModalKey] = useState<LiveConnectEmbedKey | null>(null);

  // Delete state
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  /**
   * Generates the ready-to-paste embed script tag for a given key.
   * @param keyValue - The embed key or placeholder to insert into data-key
   * @returns HTML script tag string
   */
  const getEmbedScript = (keyValue: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.notifykit.dev";
    return `<script\n  src="${baseUrl}/sdk/liveconnect.js"\n  data-key="${keyValue}"\n  async\n></script>`;
  };

  /**
   * Fetches embed keys from the API.
   */
  const fetchEmbedKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const keys = await getLiveConnectEmbedKeys(projectId);
      setEmbedKeys(Array.isArray(keys) ? keys : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load embed keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmbedKeys();
    if (currentOrg?.slug) {
      getSubscriptionStatus(currentOrg.slug)
        .then(setSubscription)
        .catch(() => {}); // Non-critical, don't block page
    }
  }, [projectId, currentOrg?.slug]);

  /**
   * Copies text to clipboard.
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  /**
   * Creates a new embed key.
   */
  const handleCreate = async () => {
    if (!embedKeyName.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const domains = embedKeyDomains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      const result = await createLiveConnectEmbedKey(projectId, {
        name: embedKeyName.trim(),
        allowedDomains: domains,
      });
      setNewEmbedKey(result);
      setShowCreateDialog(false);
      setShowSuccessDialog(true);
      setEmbedKeyName("");
      setEmbedKeyDomains("");
      await fetchEmbedKeys();
      refreshLimits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create embed key");
    } finally {
      setCreating(false);
    }
  };

  /**
   * Opens the edit dialog for an embed key.
   */
  const handleEditClick = (key: LiveConnectEmbedKey) => {
    setEditingKey(key);
    setEmbedKeyName(key.name);
    setEmbedKeyDomains(key.allowedDomains.join(", "));
    setShowEditDialog(true);
  };

  /**
   * Updates an embed key.
   */
  const handleUpdate = async () => {
    if (!editingKey || !embedKeyName.trim()) return;

    try {
      setUpdating(true);
      setError(null);
      const domains = embedKeyDomains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      await updateLiveConnectEmbedKey(projectId, editingKey.id, {
        name: embedKeyName.trim(),
        allowedDomains: domains,
      });
      setShowEditDialog(false);
      setEditingKey(null);
      setEmbedKeyName("");
      setEmbedKeyDomains("");
      await fetchEmbedKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update embed key");
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Deletes an embed key.
   */
  const handleDelete = async (keyId: string) => {
    try {
      setDeletingKeyId(keyId);
      setError(null);
      await deleteLiveConnectEmbedKey(projectId, keyId);
      await fetchEmbedKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete embed key");
    } finally {
      setDeletingKeyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {subscription && subscription.status !== "ACTIVE" && subscription.status !== "PAST_DUE" && currentOrg && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <IconCreditCard className="h-5 w-5 shrink-0 text-yellow-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Subscription required</p>
              <p className="text-xs text-muted-foreground">
                Subscribe to activate your embed keys.{" "}
                <Link
                  href={`/dashboard/o/${currentOrg.slug}/billing`}
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Go to Billing
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Embed Keys Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Embed Keys</CardTitle>
              <CardDescription>
                {limits
                  ? `${embedKeys.length} / ${limits.maxEmbedKeysPerProject} embed keys`
                  : "Keys to authenticate widget installations on customer websites"}
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger
                render={
                  <Button
                    className="gap-2"
                    disabled={limits ? embedKeys.length >= limits.maxEmbedKeysPerProject : false}
                    title={limits && embedKeys.length >= limits.maxEmbedKeysPerProject ? "Embed key limit reached" : undefined}
                  />
                }
              >
                <IconPlus className="h-4 w-4" />
                Create Key
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Embed Key</DialogTitle>
                  <DialogDescription>
                    Create a key to embed the LiveConnect widget on your website.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="embedKeyName">Name</Label>
                    <Input
                      id="embedKeyName"
                      placeholder="Production Website"
                      value={embedKeyName}
                      onChange={(e) => setEmbedKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="embedKeyDomains">Allowed Domains</Label>
                    <Input
                      id="embedKeyDomains"
                      placeholder="example.com, *.example.com"
                      value={embedKeyDomains}
                      onChange={(e) => setEmbedKeyDomains(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated list of domains. Use * for wildcards. Leave empty to allow all domains.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !embedKeyName.trim()}
                  >
                    {creating ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Loading embed keys...</p>
            </div>
          ) : embedKeys.length === 0 ? (
            <div className="py-8 text-center">
              <IconCode className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No embed keys yet. Create one to start embedding the widget.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Domains</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Used</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {embedKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <button
                        className="font-mono text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                        onClick={() => setScriptModalKey(key)}
                      >
                        {key.keyPrefix}
                      </button>
                    </TableCell>
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {key.allowedDomains.length > 0 ? (
                        <span className="text-xs">
                          {key.allowedDomains.slice(0, 2).join(", ")}
                          {key.allowedDomains.length > 2 && ` +${key.allowedDomains.length - 2}`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">All domains</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setScriptModalKey(key)}
                          title="View embed script"
                        >
                          <IconCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEditClick(key)}
                        >
                          <IconPencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={deletingKeyId === key.id}
                              />
                            }
                          >
                            <IconTrash className="h-4 w-4 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke Embed Key</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to revoke this embed key? Any widgets using this key will stop working immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => handleDelete(key.id)}
                              >
                                Revoke Key
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Embed Key</DialogTitle>
            <DialogDescription>
              Update the name and allowed domains for this embed key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEmbedKeyName">Name</Label>
              <Input
                id="editEmbedKeyName"
                value={embedKeyName}
                onChange={(e) => setEmbedKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmbedKeyDomains">Allowed Domains</Label>
              <Input
                id="editEmbedKeyDomains"
                placeholder="example.com, *.example.com"
                value={embedKeyDomains}
                onChange={(e) => setEmbedKeyDomains(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of domains. Use * for wildcards. Leave empty to allow all domains.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdate}
              disabled={updating || !embedKeyName.trim()}
            >
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog - Shows Full Key */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 text-primary" />
              Embed Key Created
            </DialogTitle>
            <DialogDescription>
              Your embed key has been created. You can view the embed script anytime by clicking the key in the table.
            </DialogDescription>
          </DialogHeader>
          {newEmbedKey && (
            <div className="space-y-4">
              <div className="bg-muted p-3">
                <p className="mb-1 text-xs text-muted-foreground">Embed Key</p>
                <div className="flex gap-2">
                  <Input
                    value={newEmbedKey.key}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newEmbedKey.key)}
                  >
                    <IconCopy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Ready-to-paste embed script</p>
                <CodeBlock code={getEmbedScript(newEmbedKey.key)} />
              </div>
            </div>
          )}
          <DialogFooter showCloseButton>
            <Button onClick={() => setShowSuccessDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Script Modal */}
      <Dialog open={!!scriptModalKey} onOpenChange={(open) => !open && setScriptModalKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Script</DialogTitle>
            <DialogDescription>
              {scriptModalKey?.name} &middot; <span className="font-mono">{scriptModalKey?.keyPrefix}</span>
            </DialogDescription>
          </DialogHeader>
          {scriptModalKey && (
            <div className="space-y-3">
              {scriptModalKey.key ? (
                <CodeBlock code={getEmbedScript(scriptModalKey.key)} />
              ) : (
                <>
                  <CodeBlock code={getEmbedScript(scriptModalKey.keyPrefix + "...")} />
                  <div className="flex items-start gap-2 bg-yellow-500/10 p-3">
                    <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                    <p className="text-xs text-muted-foreground">
                      This is a legacy key — the full value can&apos;t be recovered. Create a new key to get a ready-to-paste script.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      {/* Code Snippet Card */}
      <Card>
        <CardHeader>
          <CardTitle>Embed Code</CardTitle>
          <CardDescription>
            Add this code snippet to your website to embed the LiveConnect widget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={getEmbedScript("YOUR_EMBED_KEY")} />
          <div className="bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Click a key in the table above to get the script with your key pre-filled. The widget will automatically appear in the bottom-right corner of your website.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
