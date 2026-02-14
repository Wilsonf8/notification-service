/**
 * Widget mockup section containing the demo container.
 * @module components/landing/widget-mockup-section
 */
import { WidgetMockup } from "./widget-mockup";

/**
 * Demo container showing the widget in a simulated website environment.
 */
export function WidgetMockupSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center sm:text-3xl">
          See It in Action
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          Click the button to see how the widget works
        </p>
        <div className="mt-8 relative h-[500px] ring-1 ring-foreground/10 bg-stone-900/50 overflow-hidden">
          {/* Simulated website content */}
          <div className="p-8 space-y-4">
            <div className="h-6 w-32 bg-stone-800/50" />
            <div className="h-4 w-full max-w-md bg-stone-800/30" />
            <div className="h-4 w-full max-w-sm bg-stone-800/30" />
            <div className="h-4 w-full max-w-lg bg-stone-800/30" />
            <div className="mt-8 h-32 w-full bg-stone-800/20" />
            <div className="h-4 w-full max-w-md bg-stone-800/30" />
            <div className="h-4 w-full max-w-xs bg-stone-800/30" />
          </div>
          {/* Widget */}
          <WidgetMockup />
        </div>
      </div>
    </section>
  );
}
