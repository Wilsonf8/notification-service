/**
 * Project detail page.
 * Displays project settings, API key, and connected Telegram chats.
 * @module app/dashboard/projects/[id]/page
 */
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconCopy,
  IconEye,
  IconEyeOff,
  IconBrandTelegram,
  IconPlus,
  IconTrash,
  IconRefresh,
} from "@tabler/icons-react";
import {
  getProject,
  getProjectApiKeys,
  getProjectEvents,
  generateApiKey,
  updateProject,
  deleteProject,
  generateTelegramConnectToken,
} from "@/lib/api";
import type { Project, ApiKey, ApiKeyWithSecret, Event, ConnectToken } from "@/lib/types";

/** Page params containing the dynamic route segment */
interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Project detail page component.
 * Shows project configuration, API key management, and connected chats.
 *
 * @param props - Component props
 * @param props.params - Route parameters containing the project ID
 */
export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API key display state
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  // Settings state
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Telegram connect state
  const [connectToken, setConnectToken] = useState<ConnectToken | null>(null);
  const [generatingConnect, setGeneratingConnect] = useState(false);

  /**
   * Fetches all project data from the API.
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectData, keysData, eventsData] = await Promise.all([
        getProject(id),
        getProjectApiKeys(id),
        getProjectEvents(id),
      ]);

      setProject(projectData);
      setProjectName(projectData.name);
      setApiKeys(Array.isArray(keysData) ? keysData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  /**
   * Generates a new API key for the project.
   */
  const handleGenerateKey = async () => {
    try {
      setGeneratingKey(true);
      const result: ApiKeyWithSecret = await generateApiKey(id);
      setNewApiKey(result.key);
      setShowNewKey(true);
      // Refresh the keys list
      const keys = await getProjectApiKeys(id);
      setApiKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate API key");
    } finally {
      setGeneratingKey(false);
    }
  };

  /**
   * Copies text to clipboard.
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  /**
   * Saves project settings.
   */
  const handleSave = async () => {
    if (!projectName.trim()) return;

    try {
      setSaving(true);
      const updated = await updateProject(id, { name: projectName.trim() });
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Deletes the project.
   */
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      await deleteProject(id);
      router.push("/dashboard/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  };

  /**
   * Generates a Telegram connect link.
   */
  const handleGenerateConnectLink = async () => {
    try {
      setGeneratingConnect(true);
      setError(null);
      const token = await generateTelegramConnectToken(id);
      setConnectToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate connect link");
    } finally {
      setGeneratingConnect(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-muted-foreground">
          Manage your project settings and API access
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chats">Telegram Chats</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Use API keys to authenticate requests for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {newApiKey && (
                <div className="space-y-2 p-4 bg-primary/10 border border-primary">
                  <p className="text-sm font-medium">New API Key Generated</p>
                  <p className="text-xs text-muted-foreground">
                    Copy this key now. You won&apos;t be able to see it again.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type={showNewKey ? "text" : "password"}
                      value={newApiKey}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewKey(!showNewKey)}
                    >
                      {showNewKey ? (
                        <IconEyeOff className="h-4 w-4" />
                      ) : (
                        <IconEye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newApiKey)}
                    >
                      <IconCopy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    No API keys yet. Generate one to start using the API.
                  </p>
                  <Button onClick={handleGenerateKey} disabled={generatingKey} className="gap-2">
                    <IconPlus className="h-4 w-4" />
                    {generatingKey ? "Generating..." : "Generate API Key"}
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-mono">
                            {key.keyPrefix}...
                          </TableCell>
                          <TableCell>
                            {new Date(key.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {key.lastUsedAt
                              ? new Date(key.lastUsedAt).toLocaleDateString()
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button
                    variant="outline"
                    onClick={handleGenerateKey}
                    disabled={generatingKey}
                    className="gap-2"
                  >
                    <IconRefresh className="h-4 w-4" />
                    {generatingKey ? "Generating..." : "Regenerate Key"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>Send your first notification</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto bg-muted p-4 text-xs">
                <code>{`curl -X POST http://localhost:8081/v1/notify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"type": "test", "data": {"message": "Hello!"}}'`}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chats" className="space-y-4">
          {project.telegramDestination ? (
            <Card>
              <CardHeader>
                <CardTitle>Connected Telegram Chat</CardTitle>
                <CardDescription>
                  This project is linked to a Telegram chat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted">
                  <IconBrandTelegram className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">
                      {project.telegramDestination.username || "Telegram Chat"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {project.telegramDestination.isEnabled ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-destructive">
                          Disabled {project.telegramDestination.disabledReason && `- ${project.telegramDestination.disabledReason}`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleGenerateConnectLink}
                  disabled={generatingConnect}
                >
                  <IconRefresh className="h-4 w-4" />
                  {generatingConnect ? "Generating..." : "Reconnect Different Chat"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Connect Telegram</CardTitle>
                <CardDescription>
                  Link a Telegram chat to receive notifications from this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectToken ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/10 border border-primary">
                      <p className="text-sm font-medium mb-2">Connect Link Generated</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Click the button below to open Telegram and connect this project.
                        The link expires in 24 hours.
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={connectToken.deepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
                        >
                          <IconBrandTelegram className="h-4 w-4" />
                          Open in Telegram
                        </a>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(connectToken.deepLink)}
                        >
                          <IconCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setConnectToken(null)}
                    >
                      Generate New Link
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <IconBrandTelegram className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground text-center max-w-sm">
                      Generate a connect link to link your Telegram chat to this project.
                    </p>
                    <Button
                      className="mt-4 gap-2"
                      onClick={handleGenerateConnectLink}
                      disabled={generatingConnect}
                    >
                      <IconPlus className="h-4 w-4" />
                      {generatingConnect ? "Generating..." : "Generate Connect Link"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                Notifications sent through this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No events yet. Send your first notification using the API.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono">{event.eventType}</TableCell>
                        <TableCell>
                          <span
                            className={
                              event.status === "delivered"
                                ? "text-green-600"
                                : event.status === "failed"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {event.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(event.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>Configure your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !projectName.trim()}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Project</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this project and all its data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2"
                >
                  <IconTrash className="h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
