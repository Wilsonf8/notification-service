/**
 * Project context for managing the current project state.
 * Provides project switching, localStorage persistence, and org-grouped project access.
 * @module lib/contexts/project-context
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { getProjects } from "@/lib/api/projects";
import { isAuthenticated } from "@/lib/auth";

/** Key used for storing the last visited project ID in localStorage */
const LAST_PROJECT_KEY = "lastVisitedProjectId";

/** Project context value interface */
interface ProjectContextValue {
  /** All projects the user has access to */
  projects: Project[];
  /** The currently selected project */
  currentProject: Project | null;
  /** Projects grouped by organization slug */
  projectsByOrg: Map<string, Project[]>;
  /** Whether projects are being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Switch to a different project by ID (navigates to new URL) */
  switchProject: (projectId: string) => void;
  /** Set the current project without navigating */
  setCurrentProject: (project: Project | null) => void;
  /** Refresh the projects list from the API */
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

/** Props for the ProjectProvider component */
interface ProjectProviderProps {
  /** Child components to wrap with the provider */
  children: ReactNode;
}

/**
 * Provider component that manages project state.
 * Fetches all user projects on mount and groups them by organization.
 *
 * @param props - Component props
 * @param props.children - Child components to render within provider
 */
export function ProjectProvider({ children }: ProjectProviderProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Groups projects by their organizationSlug */
  const projectsByOrg = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const project of projects) {
      const existing = map.get(project.organizationSlug) || [];
      existing.push(project);
      map.set(project.organizationSlug, existing);
    }
    return map;
  }, [projects]);

  /**
   * Fetches all projects from the API.
   */
  const refreshProjects = useCallback(async () => {
    if (!isAuthenticated()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const allProjects = await getProjects();
      setProjects(allProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Switches to a different project by ID.
   * Updates state, persists to localStorage, and navigates.
   *
   * @param projectId - The project ID to switch to
   */
  const switchProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      setCurrentProject(project);
      localStorage.setItem(LAST_PROJECT_KEY, projectId);
      router.push(`/dashboard/p/${projectId}`);
    },
    [projects, router]
  );

  /**
   * Sets the current project and persists to localStorage.
   *
   * @param project - The project to set as current
   */
  const handleSetCurrentProject = useCallback((project: Project | null) => {
    setCurrentProject(project);
    if (project) {
      localStorage.setItem(LAST_PROJECT_KEY, project.id);
    }
  }, []);

  // Fetch projects on mount
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const value = useMemo<ProjectContextValue>(() => ({
    projects,
    currentProject,
    projectsByOrg,
    isLoading,
    error,
    switchProject,
    setCurrentProject: handleSetCurrentProject,
    refreshProjects,
  }), [projects, currentProject, projectsByOrg, isLoading, error, switchProject, handleSetCurrentProject, refreshProjects]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook to access the project context.
 * Must be used within a ProjectProvider.
 *
 * @returns The project context value
 * @throws {Error} If used outside of ProjectProvider
 */
export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}

/**
 * Returns the last visited project ID from localStorage.
 * @returns The project ID or null
 */
export function getLastVisitedProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_PROJECT_KEY);
}
