/**
 * Contact information card for a CRM visitor.
 * @module components/liveconnect/crm/visitor-contact-card
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconMail,
  IconMapPin,
  IconDeviceDesktop,
  IconBrowser,
  IconNetwork,
  IconClock,
} from "@tabler/icons-react";
import type { CrmVisitorDetail } from "@/lib/types";

interface VisitorContactCardProps {
  visitor: CrmVisitorDetail;
}

/**
 * Formats date to a readable string.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Displays contact and device information for a visitor.
 */
export function VisitorContactCard({ visitor }: VisitorContactCardProps) {
  const location = [visitor.city, visitor.region, visitor.country]
    .filter(Boolean)
    .join(", ");

  const device = [visitor.deviceType, visitor.osName, visitor.osVersion]
    .filter(Boolean)
    .join(" · ");

  const browser = [visitor.browserName, visitor.browserVersion]
    .filter(Boolean)
    .join(" ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {visitor.email && (
            <div className="flex items-center gap-2">
              <IconMail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{visitor.email}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2">
              <IconMapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{location}</span>
            </div>
          )}
          {device && (
            <div className="flex items-center gap-2">
              <IconDeviceDesktop className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{device}</span>
            </div>
          )}
          {browser && (
            <div className="flex items-center gap-2">
              <IconBrowser className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{browser}</span>
            </div>
          )}
          {visitor.ipAddress && (
            <div className="flex items-center gap-2">
              <IconNetwork className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">{visitor.ipAddress}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              First seen: {formatDate(visitor.firstSeenAt)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
