/**
 * Hero section for the LiveConnect landing page.
 * @module components/landing/hero-section
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Displays the main hero section with title, description, and CTA buttons.
 */
export function HeroSection() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          LiveConnect
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
          Real-time customer engagement platform
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex h-9 items-center justify-center bg-primary px-4 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/80 w-full sm:w-auto"
          >
            Login
          </Link>
          <Button variant="outline" size="lg" disabled className="w-full sm:w-auto">
            Join Waitlist
          </Button>
        </div>
      </div>
    </section>
  );
}
