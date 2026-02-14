/**
 * Footer section for the LiveConnect landing page.
 * @module components/landing/footer
 */
import Link from "next/link";
import { IconBrandGithub } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/**
 * Displays footer with copyright, links, and final CTA.
 */
export function Footer() {
  return (
    <footer className="border-t border-border py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; 2025 LiveConnect
          </p>

          {/* Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconBrandGithub className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-8 flex flex-col items-center gap-4 border-t border-border pt-8">
          <p className="text-center text-muted-foreground">
            Ready to engage your customers in real-time?
          </p>
          <Button variant="outline" disabled>
            Join Waitlist
          </Button>
        </div>
      </div>
    </footer>
  );
}
