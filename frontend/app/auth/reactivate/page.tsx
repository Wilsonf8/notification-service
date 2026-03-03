/**
 * Account reactivation page shown when a user with a pending deletion logs in.
 * Allows the user to reactivate their account or continue with deletion.
 * @module app/auth/reactivate/page
 */
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { reactivateAccount } from "@/lib/api";
import { removeToken } from "@/lib/auth";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";

/**
 * Formats a deletion date for display.
 * @param dateStr - ISO date string
 * @returns formatted date string or null
 */
function formatDeletionDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * Inner component that handles the reactivation flow.
 */
function ReactivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deletionDate = searchParams.get("deletion_date");
  const formattedDate = formatDeletionDate(deletionDate);

  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calls the reactivation API and redirects to the dashboard on success.
   */
  const handleReactivate = async () => {
    setReactivating(true);
    setError(null);
    try {
      await reactivateAccount();
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reactivate account"
      );
      setReactivating(false);
    }
  };

  /**
   * Clears the token and redirects away without reactivating.
   */
  const handleContinueDeletion = () => {
    removeToken();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center bg-destructive/10">
              <IconAlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle>Account Pending Deletion</CardTitle>
            <CardDescription>
              Your account is scheduled for permanent deletion
              {formattedDate ? ` on ${formattedDate}` : " within 30 days"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p>If you reactivate your account:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Your personal organization and projects will be restored</li>
                <li>
                  Team memberships will need to be re-invited by team owners
                </li>
              </ul>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleReactivate}
                disabled={reactivating}
              >
                {reactivating && (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                )}
                {reactivating ? "Reactivating..." : "Reactivate Account"}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleContinueDeletion}
                disabled={reactivating}
              >
                Continue with Deletion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Account reactivation page component.
 */
export default function ReactivatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ReactivateContent />
    </Suspense>
  );
}
