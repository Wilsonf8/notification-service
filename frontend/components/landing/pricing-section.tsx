/**
 * Pricing section displaying Free and Pro tier cards.
 * @module components/landing/pricing-section
 */
import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const freeTierFeatures = [
  "1 project",
  "1 embed key",
  "Messaging",
];

const proTierFeatures = [
  "Unlimited projects",
  "Unlimited embed keys",
  "Unlimited visitor sessions",
  "Video calls with LiveKit",
  "Messaging",
];

/**
 * Displays two pricing cards (Free and Pro) with feature lists and CTAs.
 */
export function PricingSection() {
  return (
    <section className="border-t border-border py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Simple pricing</h2>
        <p className="mt-4 text-muted-foreground">
          Start free. Upgrade when you&apos;re ready.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto mt-10">
        {/* Free tier */}
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>For getting started</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 flex-1">
            <div>
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
            <div className="border-t border-border" />
            <ul className="space-y-3">
              {freeTierFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-auto inline-flex items-center justify-center h-8 px-2.5 text-xs font-medium border border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 transition-all"
            >
              Get Started
            </Link>
          </CardContent>
        </Card>

        {/* Pro tier */}
        <Card className="ring-primary/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Pro</CardTitle>
              <Badge>Popular</Badge>
            </div>
            <CardDescription>
              For teams ready to engage customers
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <span className="text-3xl font-bold">$10</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
            <div className="border-t border-border" />
            <ul className="space-y-3">
              {proTierFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all"
            >
              Get Started
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
