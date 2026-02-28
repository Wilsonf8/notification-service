/**
 * Embed demo section showing the installation code snippet.
 * @module components/landing/embed-demo-section
 */
import { CodeBlock } from "@/components/dashboard/docs/code-block";

const EMBED_CODE = `<script src="https://hooman.live/sdk/liveconnect.js" data-key="YOUR_KEY" async></script>`;

/**
 * Displays the embed code block with copy functionality.
 */
export function EmbedDemoSection() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center sm:text-3xl">
          Add to Your Site in Seconds
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          Just paste this snippet before your closing body tag
        </p>
        <div className="mt-8">
          <CodeBlock code={EMBED_CODE} language="html" />
        </div>
      </div>
    </section>
  );
}
