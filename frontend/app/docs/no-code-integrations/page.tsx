/**
 * No-code integrations documentation page.
 * Platform-specific guides for adding LiveConnect to no-code website builders.
 * @module app/docs/no-code-integrations/page
 */
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/dashboard/docs/code-block";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";

/** Platform configuration */
interface Platform {
  id: string;
  label: string;
}

/** Available no-code platforms */
const PLATFORMS: Platform[] = [
  { id: "squarespace", label: "Squarespace" },
  { id: "webflow", label: "Webflow" },
  { id: "wordpress", label: "WordPress" },
  { id: "weebly", label: "Weebly" },
  { id: "wix", label: "Wix" },
  { id: "shopify", label: "Shopify" },
];

const scriptSnippet = `<script
  src="https://your-domain.com/sdk/liveconnect.js"
  data-key="lck_YOUR_EMBED_KEY"
></script>`;

/**
 * No-code integrations page with platform-specific guides.
 * Squarespace is complete; others are placeholders or partial.
 */
export default function NoCodeIntegrationsPage() {
  const [platform, setPlatform] = useState("squarespace");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          No-Code Integrations
        </h1>
        <p className="mt-2 text-muted-foreground">
          Add LiveConnect to your website using a no-code platform. No
          programming required.
        </p>
      </div>

      {/* Platform Tabs */}
      <Tabs value={platform} onValueChange={setPlatform}>
        <TabsList variant="line">
          {PLATFORMS.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Squarespace - Complete */}
        <TabsContent value="squarespace" className="mt-6 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Squarespace Integration</h2>
            <p className="text-muted-foreground">
              Add LiveConnect to your Squarespace site using Code Injection.
            </p>
          </section>

          <div className="flex items-start gap-3 border border-yellow-500/50 bg-yellow-500/10 p-4">
            <IconAlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-500">
                Business Plan Required
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Code Injection is only available on Squarespace Business,
                Commerce Basic, and Commerce Advanced plans. Personal and Core
                plans do not support custom JavaScript.
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">
              Step 1: Open Code Injection
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                In your Squarespace dashboard, go to{" "}
                <strong className="text-foreground">Website</strong>
              </li>
              <li>
                Click{" "}
                <strong className="text-foreground">Pages</strong>
              </li>
              <li>
                Click{" "}
                <strong className="text-foreground">Custom Code</strong>
              </li>
              <li>
                Click{" "}
                <strong className="text-foreground">Code Injection</strong>
              </li>
            </ol>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">
              Step 2: Add the LiveConnect Script
            </h3>
            <p className="text-muted-foreground">
              Paste the following code into the{" "}
              <strong className="text-foreground">Footer</strong> field:
            </p>
            <CodeBlock code={scriptSnippet} language="HTML" />
            <p className="text-sm text-muted-foreground">
              Replace{" "}
              <code className="bg-muted px-1.5 py-0.5 text-xs">
                your-domain.com
              </code>{" "}
              with your LiveConnect domain and{" "}
              <code className="bg-muted px-1.5 py-0.5 text-xs">
                lck_YOUR_EMBED_KEY
              </code>{" "}
              with your embed key from the LiveConnect dashboard.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">Step 3: Save and Test</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Click <strong className="text-foreground">Save</strong>
              </li>
              <li>Visit your live Squarespace site</li>
              <li>
                Look for the LiveConnect widget button in the corner of your
                page
              </li>
              <li>Click it to verify it opens and connects</li>
            </ol>
          </section>
        </TabsContent>

        {/* Webflow */}
        <TabsContent value="webflow" className="mt-6">
          <PlaceholderContent platform="Webflow" />
        </TabsContent>

        {/* WordPress */}
        <TabsContent value="wordpress" className="mt-6">
          <PlaceholderContent platform="WordPress" />
        </TabsContent>

        {/* Weebly */}
        <TabsContent value="weebly" className="mt-6">
          <PlaceholderContent platform="Weebly" />
        </TabsContent>

        {/* Wix */}
        <TabsContent value="wix" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-start gap-3 border border-yellow-500/50 bg-yellow-500/10 p-4">
              <IconInfoCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-500">
                  Limited Support
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Wix runs custom HTML inside a sandboxed iframe, which blocks
                  localStorage and direct page access. The standard script tag
                  approach does not work on Wix. A dedicated Wix App integration
                  is coming soon.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Shopify */}
        <TabsContent value="shopify" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-start gap-3 border border-yellow-500/50 bg-yellow-500/10 p-4">
              <IconInfoCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-500">
                  App Required
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Shopify requires a Theme App Extension for third-party
                  widgets. A dedicated Shopify App is coming soon.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Placeholder content for platforms not yet documented.
 * @param platform - The platform name to display
 */
function PlaceholderContent({ platform }: { platform: string }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border py-16">
      <div className="text-4xl">🚧</div>
      <h3 className="mt-4 text-lg font-medium">Coming Soon</h3>
      <p className="mt-2 text-center text-muted-foreground">
        {platform} integration guide is coming soon.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        In the meantime, check if your platform supports adding custom code to
        the site header or footer, and paste the LiveConnect script tag there.
      </p>
    </div>
  );
}
