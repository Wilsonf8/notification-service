/**
 * Organization context for managing the current organization state.
 * Provides organization switching and persistence across the application.
 * @module lib/contexts/organization-context
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Organization } from "@/lib/types";
import { getOrganizations } from "@/lib/api/organizations";
import { isAuthenticated } from "@/lib/auth";

/** Key used for storing the current organization slug in localStorage */
const CURRENT_ORG_KEY = "currentOrgSlug";

/** Organization context value interface */
interface OrganizationContextValue {
  /** List of all organizations the user is a member of */
  organizations: Organization[];
  /** The currently selected organization */
  currentOrg: Organization | null;
  /** Whether organizations are being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Switch to a different organization by slug */
  switchOrg: (slug: string) => void;
  /** Refresh the organizations list from the API */
  refreshOrgs: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

/** Props for the OrganizationProvider component */
interface OrganizationProviderProps {
  /** Child components to wrap with the provider */
  children: ReactNode;
}

/**
 * Provider component that manages organization state.
 * Fetches organizations on mount and persists selection in localStorage.
 *
 * @param props - Component props
 * @param props.children - Child components to render within provider
 */
export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches organizations from the API and sets the current organization.
   * Defaults to saved slug or personal org if no saved selection.
   */
  const refreshOrgs = useCallback(async () => {
    if (!isAuthenticated()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const orgs = await getOrganizations();
      setOrganizations(orgs);

      // Try to restore saved organization
      const savedSlug = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrg = savedSlug ? orgs.find((o) => o.slug === savedSlug) : null;

      if (savedOrg) {
        setCurrentOrg(savedOrg);
      } else {
        // Default to personal org
        const personalOrg = orgs.find((o) => o.isPersonal);
        if (personalOrg) {
          setCurrentOrg(personalOrg);
          localStorage.setItem(CURRENT_ORG_KEY, personalOrg.slug);
        } else if (orgs.length > 0) {
          // Fallback to first org if no personal org
          setCurrentOrg(orgs[0]);
          localStorage.setItem(CURRENT_ORG_KEY, orgs[0].slug);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Switches to a different organization by slug.
   * Persists the selection in localStorage.
   *
   * @param slug - The organization slug to switch to
   */
  const switchOrg = useCallback(
    (slug: string) => {
      const org = organizations.find((o) => o.slug === slug);
      if (org) {
        setCurrentOrg(org);
        localStorage.setItem(CURRENT_ORG_KEY, slug);
      }
    },
    [organizations]
  );

  // Fetch organizations on mount
  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  const value: OrganizationContextValue = {
    organizations,
    currentOrg,
    isLoading,
    error,
    switchOrg,
    refreshOrgs,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access the organization context.
 * Must be used within an OrganizationProvider.
 *
 * @returns The organization context value
 * @throws {Error} If used outside of OrganizationProvider
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
