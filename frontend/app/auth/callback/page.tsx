/**
 * OAuth callback page that handles the redirect from the backend after GitHub authentication.
 * Extracts the JWT token from URL parameters and stores it in localStorage.
 * @module app/auth/callback/page
 */
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Inner component that processes the OAuth callback.
 * Wrapped in Suspense because it uses useSearchParams.
 *
 * Flow:
 * 1. Backend redirects here with ?token=JWT after successful OAuth
 * 2. Token is extracted and stored in localStorage
 * 3. User is redirected to /dashboard
 *
 * On error:
 * - If ?error param present, redirects to /login with error message
 * - If no token found, redirects to /login with no_token error
 */
function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      console.error("Auth error:", error);
      router.replace("/login?error=" + encodeURIComponent(error));
      return;
    }

    if (token) {
      localStorage.setItem("token", token);
      router.replace("/dashboard");
    } else {
      router.replace("/login?error=no_token");
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Authenticating...</p>
    </div>
  );
}

/**
 * OAuth callback page component.
 * Displays a loading state while processing the authentication callback.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
