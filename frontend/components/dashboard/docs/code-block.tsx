/**
 * Code block component with syntax highlighting and copy-to-clipboard.
 * @module components/dashboard/docs/code-block
 */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/** Props for the CodeBlock component */
interface CodeBlockProps {
  /** The code content to display */
  code: string;
  /** Programming language for syntax highlighting hint */
  language?: string;
  /** Optional title displayed above the code block */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays code with a copy-to-clipboard button.
 * Uses JetBrains Mono font and dark background for readability.
 *
 * @param props - Component props
 * @param props.code - The code content to display
 * @param props.language - Programming language (for display purposes)
 * @param props.title - Optional title above the code block
 * @param props.className - Additional CSS classes
 */
export function CodeBlock({ code, language, title, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Copies the code to clipboard and shows feedback.
   */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group relative", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          {language && (
            <span className="text-xs text-muted-foreground">{language}</span>
          )}
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto bg-zinc-950 p-4 text-xs text-zinc-100">
          <code className="font-mono">{code}</code>
        </pre>
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100"
          onClick={handleCopy}
        >
          {copied ? (
            <IconCheck className="h-3 w-3 text-green-500" />
          ) : (
            <IconCopy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

/** Props for the InlineCode component */
interface InlineCodeProps {
  /** The code content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays inline code with monospace font and subtle background.
 *
 * @param props - Component props
 * @param props.children - The code content
 * @param props.className - Additional CSS classes
 */
export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        "rounded-none bg-muted px-1.5 py-0.5 font-mono text-xs",
        className
      )}
    >
      {children}
    </code>
  );
}
