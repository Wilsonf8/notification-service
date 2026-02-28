/**
 * Hero section for the LiveConnect landing page.
 * Combines hero content with feature cards in a side-by-side layout on desktop.
 * @module components/landing/hero-section
 */
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IconVideo, IconCode } from "@tabler/icons-react";

/**
 * Displays the main hero section with title, description, CTA button,
 * and feature cards in a responsive grid layout.
 */
export function HeroSection() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="max-w-5xl mx-auto w-full lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
        {/* Left column: Hero content */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            hooman.live
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Real-time customer engagement platform
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex h-9 items-center justify-center border border-primary bg-primary px-4 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/80 w-full sm:w-auto sm:min-w-28"
            >
              Login
            </Link>
            <Link
              href="/docs"
              className="flex h-9 items-center justify-center border border-border px-4 text-xs font-medium text-foreground transition-all hover:bg-muted w-full sm:w-auto sm:min-w-28"
            >
              Docs
            </Link>
          </div>
        </div>

        {/* Right column: Feature cards */}
        <div className="mt-12 lg:mt-0 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground">
                  <IconVideo className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Live Video Chats</CardTitle>
                  <CardDescription>
                    Connect with customers face-to-face in real-time
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground">
                  <IconCode className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Easy Embed</CardTitle>
                  <CardDescription>
                    Add to any website with a single script tag
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}
