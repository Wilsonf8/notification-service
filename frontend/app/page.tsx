import { HeroSection } from "@/components/landing/hero-section";
import { EmbedDemoSection } from "@/components/landing/embed-demo-section";
import { WidgetMockupSection } from "@/components/landing/widget-mockup-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";

/**
 * LiveConnect landing page.
 */
export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <EmbedDemoSection />
      <WidgetMockupSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
