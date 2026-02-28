/**
 * Configuration documentation page.
 * Widget configuration options and customization.
 * @module app/docs/configuration/page
 */

import { CodeBlock } from "@/components/dashboard/docs/code-block";

/**
 * Configuration page for LiveConnect widget documentation.
 * Documents all available configuration options.
 */
export default function ConfigurationPage() {
  const positionExample = `<script
  src="https://your-domain.com/sdk/liveconnect.js"
  data-key="lck_YOUR_EMBED_KEY"
  data-position="bottom-left"
></script>`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Customize the hooman.live widget appearance and behavior.
        </p>
      </div>

      {/* Script Attributes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Script Attributes</h2>
        <p className="text-muted-foreground">
          Configure the widget using data attributes on the script tag.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Attribute</th>
                <th className="px-4 py-3 text-left font-medium">Required</th>
                <th className="px-4 py-3 text-left font-medium">Default</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">data-key</code>
                </td>
                <td className="px-4 py-3 text-green-500">Yes</td>
                <td className="px-4 py-3 text-muted-foreground">-</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Your embed key from the project settings. Starts with{" "}
                  <code className="bg-muted px-1 text-xs">lck_</code>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">data-position</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">No</td>
                <td className="px-4 py-3">
                  <code className="bg-muted px-1 text-xs">bottom-right</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Widget position on the screen
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Position Options */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Widget Position</h2>
        <p className="text-muted-foreground">
          Control where the widget appears on the screen using the{" "}
          <code className="bg-muted px-1.5 py-0.5 text-sm">data-position</code> attribute.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-border p-4">
            <code className="text-sm text-primary">bottom-right</code>
            <p className="mt-1 text-sm text-muted-foreground">
              Bottom right corner (default)
            </p>
          </div>
          <div className="border border-border p-4">
            <code className="text-sm text-primary">bottom-left</code>
            <p className="mt-1 text-sm text-muted-foreground">
              Bottom left corner
            </p>
          </div>
          <div className="border border-border p-4">
            <code className="text-sm text-primary">top-right</code>
            <p className="mt-1 text-sm text-muted-foreground">
              Top right corner
            </p>
          </div>
          <div className="border border-border p-4">
            <code className="text-sm text-primary">top-left</code>
            <p className="mt-1 text-sm text-muted-foreground">
              Top left corner
            </p>
          </div>
        </div>

        <h3 className="text-lg font-medium">Example</h3>
        <CodeBlock code={positionExample} language="HTML" />
      </section>

      {/* Permissions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Required Permissions</h2>
        <p className="text-muted-foreground">
          For video calls to work, your website must allow camera and microphone access.
          This is configured via HTTP headers, not script attributes.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Permission</th>
                <th className="px-4 py-3 text-left font-medium">Required For</th>
                <th className="px-4 py-3 text-left font-medium">Header Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3">Camera</td>
                <td className="px-4 py-3 text-muted-foreground">Video calls</td>
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">camera=(self)</code>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">Microphone</td>
                <td className="px-4 py-3 text-muted-foreground">Video calls, audio</td>
                <td className="px-4 py-3">
                  <code className="bg-muted px-1.5 py-0.5 text-xs">microphone=(self)</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          See the{" "}
          <a href="/docs/installation" className="text-primary hover:underline">
            Installation Guide
          </a>{" "}
          for framework-specific instructions on configuring these headers.
        </p>
      </section>

      {/* Coming Soon */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Advanced Configuration</h2>
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-12">
          <div className="text-4xl">🚧</div>
          <h3 className="mt-4 text-lg font-medium">Coming Soon</h3>
          <p className="mt-2 text-center text-muted-foreground">
            Advanced configuration options including custom styling, callbacks,
            and programmatic control are coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
