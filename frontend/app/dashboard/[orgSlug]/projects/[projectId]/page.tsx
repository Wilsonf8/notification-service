/**
 * Project default page.
 * Shows Live Users for LiveConnect or Overview for NotifyKit.
 * @module app/dashboard/[orgSlug]/projects/[projectId]/page
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  IconPlus,
  IconRefresh,
  IconArrowRight,
} from "@tabler/icons-react";
import Link from "next/link";
import { CodeBlock } from "@/components/dashboard/docs/code-block";
import { useProject } from "./layout";
import { getProjectApiKeys, generateApiKey } from "@/lib/api";
import type { ApiKey, ApiKeyWithSecret } from "@/lib/types";
import { LiveUsersPanel } from "@/components/liveconnect/live-users-panel";

/**
 * Project default page component.
 * Renders different content based on project type.
 */
export default function ProjectPage() {
  const { project } = useProject();

  if (project.type === "LIVECONNECT") {
    return <LiveConnectOverview />;
  }

  return <NotifyKitOverview />;
}

/**
 * LiveConnect overview - Live Users panel.
 */
function LiveConnectOverview() {
  const { projectId } = useProject();

  return <LiveUsersPanel projectId={projectId} />;
}

/**
 * NotifyKit overview - API Keys and Quick Start.
 */
function NotifyKitOverview() {
  const { projectId } = useProject();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API key display state
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  // Quick start language tab state
  const [quickStartLang, setQuickStartLang] = useState("javascript");

  /**
   * Fetches API keys for the project.
   */
  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const keysData = await getProjectApiKeys(projectId);
      setApiKeys(Array.isArray(keysData) ? keysData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [projectId]);

  /**
   * Generates a new API key for the project.
   */
  const handleGenerateKey = async () => {
    try {
      setGeneratingKey(true);
      const result: ApiKeyWithSecret = await generateApiKey(projectId);
      setNewApiKey(result.key);
      setShowNewKey(true);
      // Refresh the keys list
      const keys = await getProjectApiKeys(projectId);
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
  };

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Use API keys to authenticate requests for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newApiKey && (
            <div className="space-y-2 border border-primary bg-primary/10 p-4">
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

          {loading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
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
                    <TableHead className="hidden sm:table-cell">Last Used</TableHead>
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
                      <TableCell className="hidden sm:table-cell">
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
        <CardContent className="space-y-4">
          <Tabs value={quickStartLang} onValueChange={setQuickStartLang}>
            <TabsList variant="line" className="overflow-x-auto">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="java">Java</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>

            <TabsContent value="javascript" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">Install the SDK:</p>
              <CodeBlock code="npm install notifykitdev" />
              <p className="text-xs text-muted-foreground">Send a notification:</p>
              <CodeBlock code={`import NotifyKit from 'notifykitdev';

NotifyKit.init('${newApiKey || "YOUR_API_KEY"}');
NotifyKit.notify('Hello from NotifyKit!');`} />
            </TabsContent>

            <TabsContent value="python" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">Install the SDK:</p>
              <CodeBlock code="pip install notifykitdev" />
              <p className="text-xs text-muted-foreground">Send a notification:</p>
              <CodeBlock code={`from notifykit import NotifyKit

NotifyKit.init("${newApiKey || "YOUR_API_KEY"}")
NotifyKit.notify("Hello from NotifyKit!")`} />
            </TabsContent>

            <TabsContent value="java" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">Add to your pom.xml:</p>
              <CodeBlock code={`<dependency>
    <groupId>io.github.wilsonf8</groupId>
    <artifactId>notifykitdev</artifactId>
    <version>1.0.0</version>
</dependency>`} />
              <p className="text-xs text-muted-foreground">Send a notification:</p>
              <CodeBlock code={`import dev.notifykit.NotifyKit;

NotifyKit.init("${newApiKey || "YOUR_API_KEY"}");
NotifyKit.notify("Hello from NotifyKit!");`} />
            </TabsContent>

            <TabsContent value="curl" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">Send a notification:</p>
              <CodeBlock code={`curl -X POST ${process.env.NEXT_PUBLIC_API_URL || "https://api.notifykit.dev"}/v1/notify \\
  -H "X-API-Key: ${newApiKey || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello from NotifyKit!"}'`} />
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Need more examples?
            </p>
            <Link
              href="/dashboard/docs"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View full documentation
              <IconArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
