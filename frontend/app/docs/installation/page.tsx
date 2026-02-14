/**
 * Installation documentation page.
 * Framework-specific installation guides with Next.js complete.
 * @module app/docs/installation/page
 */
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/dashboard/docs/code-block";
import { IconAlertTriangle } from "@tabler/icons-react";

/** Framework configuration */
interface Framework {
  id: string;
  label: string;
}

/** Available frameworks */
const FRAMEWORKS: Framework[] = [
  { id: "nextjs", label: "Next.js" },
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "angular", label: "Angular" },
  { id: "html", label: "HTML/JS" },
];

/**
 * Installation page with framework-specific guides.
 * Next.js section is complete; others are placeholders.
 */
export default function InstallationPage() {
  const [framework, setFramework] = useState("nextjs");

  const nextjsLayoutCode = `// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://your-domain.com/sdk/liveconnect.js"
          data-key="lck_YOUR_EMBED_KEY"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}`;

  const nextjsConfigCode = `// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;`;

  const htmlCode = `<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->

  <!-- Add LiveConnect widget -->
  <script
    src="https://your-domain.com/sdk/liveconnect.js"
    data-key="lck_YOUR_EMBED_KEY"
  ></script>
</body>
</html>`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Installation</h1>
        <p className="mt-2 text-muted-foreground">
          Framework-specific guides for adding LiveConnect to your website.
        </p>
      </div>

      {/* Framework Tabs */}
      <Tabs value={framework} onValueChange={setFramework}>
        <TabsList variant="line">
          {FRAMEWORKS.map((fw) => (
            <TabsTrigger key={fw.id} value={fw.id}>
              {fw.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Next.js - Complete */}
        <TabsContent value="nextjs" className="mt-6 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Next.js Integration</h2>
            <p className="text-muted-foreground">
              Add LiveConnect to your Next.js application using the Script component
              for optimal loading performance.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">Step 1: Add the Script Tag</h3>
            <p className="text-muted-foreground">
              Add the LiveConnect script to your root layout file. Using{" "}
              <code className="bg-muted px-1.5 py-0.5 text-sm">strategy=&quot;lazyOnload&quot;</code>{" "}
              ensures the widget loads after the page is interactive.
            </p>
            <CodeBlock code={nextjsLayoutCode} language="TypeScript" title="app/layout.tsx" />
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">Step 2: Configure Permissions Policy</h3>
            <div className="flex items-start gap-3 border border-yellow-500/50 bg-yellow-500/10 p-4">
              <IconAlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-500">Required for Video Calls</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Video calls require camera and microphone access. You must configure
                  the Permissions-Policy header to allow these features.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground">
              Add or update your <code className="bg-muted px-1.5 py-0.5 text-sm">next.config.ts</code>{" "}
              to include the Permissions-Policy header:
            </p>
            <CodeBlock code={nextjsConfigCode} language="TypeScript" title="next.config.ts" />
            <div className="border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium">Important Notes:</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  <code className="bg-muted px-1 text-xs">camera=(self)</code> allows camera access for your domain
                </li>
                <li>
                  <code className="bg-muted px-1 text-xs">microphone=(self)</code> allows microphone access for your domain
                </li>
                <li>
                  Using <code className="bg-muted px-1 text-xs">camera=()</code> or{" "}
                  <code className="bg-muted px-1 text-xs">microphone=()</code> (empty) will block video calls
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">Step 3: Deploy and Test</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Deploy your changes to your hosting platform</li>
              <li>Visit your website and look for the LiveConnect widget in the corner</li>
              <li>Click the widget to test requesting a call</li>
              <li>Verify that camera and microphone permissions are requested</li>
            </ol>
          </section>
        </TabsContent>

        {/* React - Placeholder */}
        <TabsContent value="react" className="mt-6">
          <PlaceholderContent framework="React" />
        </TabsContent>

        {/* Vue - Placeholder */}
        <TabsContent value="vue" className="mt-6">
          <PlaceholderContent framework="Vue" />
        </TabsContent>

        {/* Angular - Placeholder */}
        <TabsContent value="angular" className="mt-6">
          <PlaceholderContent framework="Angular" />
        </TabsContent>

        {/* HTML/JS - Basic */}
        <TabsContent value="html" className="mt-6 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">HTML/JavaScript Integration</h2>
            <p className="text-muted-foreground">
              For static sites or any HTML page, add the script tag before the closing{" "}
              <code className="bg-muted px-1.5 py-0.5 text-sm">&lt;/body&gt;</code> tag.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">Add the Script Tag</h3>
            <CodeBlock code={htmlCode} language="HTML" />
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium">Server Configuration</h3>
            <p className="text-muted-foreground">
              For video calls to work, your server must send the following HTTP header:
            </p>
            <CodeBlock
              code="Permissions-Policy: camera=(self), microphone=(self)"
              language="HTTP Header"
            />
            <p className="text-sm text-muted-foreground">
              How to configure this depends on your web server (Apache, Nginx, etc.).
              Check your server documentation for how to add custom response headers.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Placeholder content for frameworks not yet documented.
 */
function PlaceholderContent({ framework }: { framework: string }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border py-16">
      <div className="text-4xl">🚧</div>
      <h3 className="mt-4 text-lg font-medium">Coming Soon</h3>
      <p className="mt-2 text-center text-muted-foreground">
        {framework} integration documentation is coming soon.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        In the meantime, see the{" "}
        <button
          onClick={() => {
            const tabs = document.querySelector('[role="tablist"]');
            const htmlTab = tabs?.querySelector('[value="html"]') as HTMLButtonElement;
            htmlTab?.click();
          }}
          className="text-primary hover:underline"
        >
          HTML/JS guide
        </button>{" "}
        for basic integration.
      </p>
    </div>
  );
}
