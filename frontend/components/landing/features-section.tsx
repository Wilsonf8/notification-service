/**
 * Features section showcasing LiveConnect capabilities.
 * @module components/landing/features-section
 */
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IconVideo, IconCode } from "@tabler/icons-react";

/**
 * Displays feature cards highlighting key platform capabilities.
 */
export function FeaturesSection() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-6 sm:grid-cols-2">
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
