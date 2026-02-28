/**
 * Interactive widget mockup demonstrating the LiveConnect widget.
 * @module components/landing/widget-mockup
 */
"use client";

import { useState } from "react";
import { IconVideo, IconX, IconMessage } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/**
 * Interactive demo of the LiveConnect widget with expandable panel.
 * Positioned absolutely within its container (not fixed).
 */
export function WidgetMockup() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Open Hooman"
        >
          <IconVideo className="h-6 w-6" />
          {/* Status dot */}
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center">
            <span className="absolute h-3 w-3 rounded-full bg-green-500" />
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-green-500 opacity-75" />
          </span>
        </button>
      )}

      {/* Expanded Panel */}
      {isOpen && (
        <div className="absolute bottom-4 right-4 flex w-80 flex-col bg-stone-950 shadow-xl ring-1 ring-foreground/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <IconVideo className="h-5 w-5 text-primary" />
              <span className="font-medium">Hooman</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-primary/10">
              <IconVideo className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-sm font-medium">Welcome!</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Start a live video chat with our team
            </p>
            <div className="mt-6 flex w-full flex-col gap-2">
              <Button size="lg" className="w-full">
                <IconVideo className="mr-2 h-4 w-4" />
                Start Video Call
              </Button>
              <Button variant="outline" size="lg" className="w-full">
                <IconMessage className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground">
              Powered by Hooman
            </span>
          </div>
        </div>
      )}
    </>
  );
}
