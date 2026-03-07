/**
 * Tour definitions registry.
 * Contains all available product tours.
 * @module lib/tour/tours
 */

import type { TourDefinition } from "./types";

/** All available product tours */
export const TOURS: TourDefinition[] = [
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    description: "Learn the basics of navigating the dashboard",
    steps: [
      {
        target: '[data-tour="project-switcher"]',
        title: "Project Switcher",
        content:
          "Switch between your projects and organizations here. Each project has its own set of users, conversations, and settings.",
        placement: "right",
      },
      {
        target: '[data-tour="sidebar-nav"]',
        title: "Sidebar Navigation",
        content:
          "Navigate between sections like Live Users, Conversations, CRM, Reps, and more. The active page is highlighted.",
        placement: "right",
      },
      {
        target: '[data-tour="notification-bell"]',
        title: "Notifications",
        content:
          "View organization invitations and alerts here. A badge appears when you have pending notifications.",
        placement: "bottom",
      },
      {
        target: '[data-tour="tour-launcher"]',
        title: "How To Guides",
        content:
          "Come back here anytime to replay a guide or discover new ones. Completed guides show a checkmark.",
        placement: "bottom",
      },
      {
        target: '[data-tour="main-content"]',
        title: "Main Content Area",
        content:
          "Your page content appears here. Use the sidebar to switch between different sections of your project.",
        placement: "top",
      },
    ],
  },
];
