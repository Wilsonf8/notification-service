/**
 * Login page with GitHub OAuth authentication.
 * Redirects users to the backend OAuth endpoint for GitHub sign-in.
 * @module app/login/page
 */
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBrandGithub } from "@tabler/icons-react";

/** Backend API base URL for OAuth redirect */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

/**
 * Login form component that displays the GitHub sign-in button.
 * Wrapped in Suspense because it uses useSearchParams.
 *
 * Displays error messages when redirected from:
 * - /auth/callback with authentication failures
 * - Protected routes when session expires
 */
function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  /**
   * Initiates the OAuth flow by redirecting to the backend's GitHub OAuth endpoint.
   * The backend handles the OAuth dance and redirects back to /auth/callback with a JWT.
   * Passes the current origin so the backend knows where to redirect after auth.
   */
  const handleLogin = () => {
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${API_URL}/oauth2/authorization/github?redirect_origin=${origin}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">LiveConnect</CardTitle>
          <CardDescription>Sign in to engage with your customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive text-center">
              {error === "session_expired" &&
                "Session expired. Please sign in again."}
              {error === "no_token" &&
                "Authentication failed. Please try again."}
              {!["session_expired", "no_token"].includes(error) && error}
            </p>
          )}
          <Button onClick={handleLogin} className="w-full gap-2">
            <IconBrandGithub className="h-5 w-5" />
            Sign in with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Login page component.
 * Displays the login form with GitHub OAuth option.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
