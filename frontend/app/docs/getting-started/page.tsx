/**
 * Getting Started documentation page.
 * Overview of LiveConnect widget and quick start guide.
 * @module app/docs/getting-started/page
 */

import Link from "next/link";
import { CodeBlock } from "@/components/dashboard/docs/code-block";

/**
 * Getting Started page for LiveConnect widget documentation.
 * Introduces the widget and provides a quick start example.
 */
export default function GettingStartedPage() {
  const quickStartCode = `<script
  src="https://your-domain.com/sdk/liveconnect.js"
  data-key="lck_YOUR_EMBED_KEY"
></script>`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
        <p className="mt-2 text-muted-foreground">
          Learn how to integrate LiveConnect into your website for instant video calls.
        </p>
      </div>

      {/* What is LiveConnect */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">What is LiveConnect?</h2>
        <p className="text-muted-foreground">
          LiveConnect is an embeddable widget that enables real-time video calls between
          your website visitors and your team. With a single script tag, you can add
          a professional video calling experience to any website.
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Instant video calls with no app downloads required</li>
          <li>Real-time presence detection for your sales team</li>
          <li>In-call text chat for sharing links and information</li>
          <li>Works on desktop and mobile browsers</li>
        </ul>
      </section>

      {/* How It Works */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-border p-4">
            <div className="text-2xl font-bold text-primary">1</div>
            <h3 className="mt-2 font-medium">Embed Widget</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the LiveConnect script to your website with your embed key.
            </p>
          </div>
          <div className="border border-border p-4">
            <div className="text-2xl font-bold text-primary">2</div>
            <h3 className="mt-2 font-medium">Visitor Requests Call</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Visitors click the widget to request a video call with your team.
            </p>
          </div>
          <div className="border border-border p-4">
            <div className="text-2xl font-bold text-primary">3</div>
            <h3 className="mt-2 font-medium">Connect Instantly</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your team accepts the call and connects via browser-based video.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Start</h2>
        <p className="text-muted-foreground">
          Add the following script tag to your website, replacing the placeholder with your embed key:
        </p>
        <CodeBlock code={quickStartCode} language="HTML" />
        <p className="text-sm text-muted-foreground">
          Your embed key can be found in the{" "}
          <Link href="/dashboard" className="text-primary hover:underline">
            project settings
          </Link>{" "}
          of your LiveConnect dashboard.
        </p>
      </section>

      {/* Next Steps */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Next Steps</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/docs/installation"
            className="group block border border-border p-4 transition-colors hover:border-primary"
          >
            <h3 className="font-medium group-hover:text-primary">Installation Guide</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Framework-specific installation instructions for Next.js, React, and more.
            </p>
          </Link>
          <Link
            href="/docs/configuration"
            className="group block border border-border p-4 transition-colors hover:border-primary"
          >
            <h3 className="font-medium group-hover:text-primary">Configuration</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize the widget position, appearance, and behavior.
            </p>
          </Link>
          <Link
            href="/docs/api-reference"
            className="group block border border-border p-4 transition-colors hover:border-primary"
          >
            <h3 className="font-medium group-hover:text-primary">API Reference</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Learn about widget events, methods, and programmatic control.
            </p>
          </Link>
          <Link
            href="/docs/troubleshooting"
            className="group block border border-border p-4 transition-colors hover:border-primary"
          >
            <h3 className="font-medium group-hover:text-primary">Troubleshooting</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Solutions for common issues like permissions and popup blockers.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
