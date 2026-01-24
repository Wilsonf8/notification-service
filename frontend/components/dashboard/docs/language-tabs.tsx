/**
 * Language and framework tab components for documentation.
 * @module components/dashboard/docs/language-tabs
 */
"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Language configuration */
interface Language {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
}

/** Available SDK languages */
export const SDK_LANGUAGES: Language[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "curl", label: "cURL" },
];

/** Available framework options per language */
export const FRAMEWORKS: Record<string, Language[]> = {
  javascript: [
    { id: "express", label: "Express" },
    { id: "nextjs", label: "Next.js" },
    { id: "react", label: "React" },
  ],
  python: [
    { id: "fastapi", label: "FastAPI" },
    { id: "flask", label: "Flask" },
    { id: "django", label: "Django" },
  ],
  java: [
    { id: "spring", label: "Spring Boot" },
    { id: "plain", label: "Plain Java" },
  ],
  curl: [],
};

/** Props for LanguageTabs component */
interface LanguageTabsProps {
  /** Currently selected language */
  value: string;
  /** Callback when language changes */
  onValueChange: (value: string) => void;
  /** Child content for each tab */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tab navigation for selecting SDK language.
 *
 * @param props - Component props
 */
export function LanguageTabs({
  value,
  onValueChange,
  children,
  className,
}: LanguageTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList variant="line">
        {SDK_LANGUAGES.map((lang) => (
          <TabsTrigger key={lang.id} value={lang.id}>
            {lang.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

/** Props for LanguageTabContent component */
interface LanguageTabContentProps {
  /** Language identifier this content is for */
  value: string;
  /** Tab content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Content panel for a specific language tab.
 *
 * @param props - Component props
 */
export function LanguageTabContent({
  value,
  children,
  className,
}: LanguageTabContentProps) {
  return (
    <TabsContent value={value} className={cn("mt-4", className)}>
      {children}
    </TabsContent>
  );
}

/** Props for FrameworkTabs component */
interface FrameworkTabsProps {
  /** Currently selected language (to determine available frameworks) */
  language: string;
  /** Currently selected framework */
  value: string;
  /** Callback when framework changes */
  onValueChange: (value: string) => void;
  /** Child content for each tab */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tab navigation for selecting framework within a language.
 *
 * @param props - Component props
 */
export function FrameworkTabs({
  language,
  value,
  onValueChange,
  children,
  className,
}: FrameworkTabsProps) {
  const frameworks = FRAMEWORKS[language] || [];

  if (frameworks.length === 0) {
    return <>{children}</>;
  }

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList variant="line">
        {frameworks.map((fw) => (
          <TabsTrigger key={fw.id} value={fw.id}>
            {fw.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

/** Props for FrameworkTabContent component */
interface FrameworkTabContentProps {
  /** Framework identifier this content is for */
  value: string;
  /** Tab content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Content panel for a specific framework tab.
 *
 * @param props - Component props
 */
export function FrameworkTabContent({
  value,
  children,
  className,
}: FrameworkTabContentProps) {
  return (
    <TabsContent value={value} className={cn("mt-4", className)}>
      {children}
    </TabsContent>
  );
}
