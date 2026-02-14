/**
 * Troubleshooting documentation page.
 * Common issues and solutions for LiveConnect widget.
 * @module app/docs/troubleshooting/page
 */

import Link from "next/link";
import { CodeBlock } from "@/components/dashboard/docs/code-block";
import { IconAlertCircle, IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";

/**
 * Troubleshooting page for LiveConnect widget documentation.
 * Documents common issues and their solutions.
 */
export default function TroubleshootingPage() {
  const permissionsPolicyCode = `// next.config.ts
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

  const httpHeaderCode = `Permissions-Policy: camera=(self), microphone=(self)`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Troubleshooting</h1>
        <p className="mt-2 text-muted-foreground">
          Solutions for common issues when integrating the LiveConnect widget.
        </p>
      </div>

      {/* Video Call Popup Issue - Most Important */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-red-500/20">
            <IconAlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold">Video Call Popup Opens Blank Then Closes</h2>
        </div>

        <div className="border-l-4 border-red-500 bg-red-500/10 p-4">
          <p className="font-medium">Symptoms:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Popup window opens but appears blank or white</li>
            <li>Window closes automatically after about 1 second</li>
            <li>Console shows: <code className="bg-muted px-1 text-xs">&quot;Permissions policy violation: camera/microphone is not allowed&quot;</code></li>
            <li>Error: <code className="bg-muted px-1 text-xs">&quot;Permission denied&quot;</code></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Cause</h3>
          <p className="text-muted-foreground">
            Your website has restrictive <code className="bg-muted px-1.5 py-0.5 text-sm">Permissions-Policy</code> HTTP
            headers that deny camera and microphone access. This is common with many hosting platforms
            that set secure defaults.
          </p>
          <p className="text-muted-foreground">
            If your headers include <code className="bg-muted px-1.5 py-0.5 text-sm">camera=()</code> or{" "}
            <code className="bg-muted px-1.5 py-0.5 text-sm">microphone=()</code> (empty parentheses),
            the browser will block access to these devices.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Solution (Next.js)</h3>
          <p className="text-muted-foreground">
            Update your <code className="bg-muted px-1.5 py-0.5 text-sm">next.config.ts</code> to allow
            camera and microphone access:
          </p>
          <CodeBlock code={permissionsPolicyCode} language="TypeScript" title="next.config.ts" />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Solution (Other Frameworks)</h3>
          <p className="text-muted-foreground">
            Ensure your web server sends this HTTP header in responses:
          </p>
          <CodeBlock code={httpHeaderCode} language="HTTP Header" />
          <p className="text-sm text-muted-foreground">
            Configure this in your web server (Apache, Nginx) or hosting platform settings.
          </p>
        </div>

        <div className="flex items-start gap-3 border border-blue-500/50 bg-blue-500/10 p-4">
          <IconInfoCircle className="h-5 w-5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="font-medium text-blue-500">How to Check Your Headers</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open your browser&apos;s Developer Tools, go to the Network tab, refresh the page,
              click on the main document request, and look for the{" "}
              <code className="bg-muted px-1 text-xs">permissions-policy</code> header in the response.
            </p>
          </div>
        </div>
      </section>

      {/* Widget Not Appearing */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-yellow-500/20">
            <IconAlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold">Widget Not Appearing</h2>
        </div>

        <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4">
          <p className="font-medium">Symptoms:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Page loads but no widget button appears in the corner</li>
            <li>No visible errors on the page</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Checklist</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Check the embed key:</strong> Ensure the{" "}
              <code className="bg-muted px-1.5 py-0.5 text-sm">data-key</code> attribute starts with{" "}
              <code className="bg-muted px-1.5 py-0.5 text-sm">lck_</code>
            </li>
            <li>
              <strong>Check the console:</strong> Open Developer Tools and look for errors containing &quot;LiveConnect&quot;
            </li>
            <li>
              <strong>Verify script URL:</strong> Ensure the script URL is accessible and not blocked
            </li>
            <li>
              <strong>Check for CSP issues:</strong> Content Security Policy may block the script
            </li>
            <li>
              <strong>Check project status:</strong> Ensure the project is active in your dashboard
            </li>
          </ol>
        </div>
      </section>

      {/* Popup Blocked */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-yellow-500/20">
            <IconAlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold">Popup Blocked by Browser</h2>
        </div>

        <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4">
          <p className="font-medium">Symptoms:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Call appears to start but no video window opens</li>
            <li>Browser shows popup blocked notification</li>
            <li>Console warning about popup being blocked</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Cause</h3>
          <p className="text-muted-foreground">
            Browser popup blockers prevent the video call window from opening.
            This typically happens when the popup is not triggered by a direct user action.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Solutions</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>For users:</strong> Allow popups for your website in browser settings
            </li>
            <li>
              <strong>For developers:</strong> The widget handles popup opening correctly,
              but aggressive popup blockers may still interfere
            </li>
            <li>
              <strong>Browser extensions:</strong> Some ad blockers also block popups -
              users may need to whitelist your domain
            </li>
          </ul>
        </div>
      </section>

      {/* WebSocket Connection Issues */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-yellow-500/20">
            <IconAlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold">WebSocket Connection Failed</h2>
        </div>

        <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4">
          <p className="font-medium">Symptoms:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Widget appears but shows as offline or unavailable</li>
            <li>Console shows WebSocket connection errors</li>
            <li>Rep presence doesn&apos;t update</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Possible Causes</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Network issues:</strong> Firewall or proxy blocking WebSocket connections
            </li>
            <li>
              <strong>Invalid embed key:</strong> The key may be invalid or for a different project
            </li>
            <li>
              <strong>Server unavailable:</strong> The LiveConnect server may be temporarily unavailable
            </li>
          </ul>
        </div>
      </section>

      {/* Camera/Mic Not Working */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-yellow-500/20">
            <IconAlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold">Camera or Microphone Not Working</h2>
        </div>

        <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4">
          <p className="font-medium">Symptoms:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Video call connects but shows black video or no audio</li>
            <li>Other party can&apos;t see or hear you</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Checklist</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Browser permissions:</strong> Ensure you clicked &quot;Allow&quot; when prompted for camera/microphone
            </li>
            <li>
              <strong>System permissions:</strong> Check your operating system settings allow the browser to access camera/microphone
            </li>
            <li>
              <strong>Hardware:</strong> Verify your camera and microphone work in other applications
            </li>
            <li>
              <strong>Other applications:</strong> Close other apps that might be using the camera/microphone
            </li>
          </ol>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="border border-border p-6">
        <h2 className="text-xl font-semibold">Still Need Help?</h2>
        <p className="mt-2 text-muted-foreground">
          If you&apos;re still experiencing issues, please contact support with:
        </p>
        <ul className="mt-4 list-disc list-inside space-y-2 text-muted-foreground">
          <li>Your embed key (you can share this safely)</li>
          <li>Browser and version (e.g., Chrome 120)</li>
          <li>Operating system (e.g., macOS 14, Windows 11)</li>
          <li>Console errors (screenshot or text)</li>
          <li>Steps to reproduce the issue</li>
        </ul>
      </section>
    </div>
  );
}
