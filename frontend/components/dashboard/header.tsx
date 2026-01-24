/**
 * Dashboard header component with user menu.
 * Displays at the top of all dashboard pages.
 * @module components/dashboard/header
 */
"use client";

import { useRouter } from "next/navigation";
import { removeToken } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IconLogout, IconUser } from "@tabler/icons-react";

/**
 * Dashboard header with user dropdown menu.
 * Provides logout functionality and navigation to user settings.
 */
export function DashboardHeader() {
  const router = useRouter();

  /**
   * Handles user logout by clearing the token and redirecting to login.
   */
  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div>{/* Breadcrumbs or page title can go here */}</div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center outline-none">
          <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
            <IconUser className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <IconLogout className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
