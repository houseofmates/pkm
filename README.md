# PKM Frontend - React + NocoBase + SimplyPlural

**For the User:**
This is your personal Knowledge Management System, integrated with your Headmate system (SimplyPlural) and a flexible database backend (NocoBase). It is designed to be a unified, beautiful, and "lowercase-mode" interface for managing your life, system, and data on both mobile and desktop. It features an infinite canvas home page, detailed database views (Calendar, Kanban, Table, Gallery), and comprehensive personalization options.

---

**Context for LLMs:**
This application is a **Persistent Knowledge Management (PKM)** frontend built with **React, Vite, TypeScript, and Tailwind CSS**. It interacts with two primary APIs:
1.  **NocoBase**: A self-hosted no-code database platform. This app acts as a custom, polished frontend for NocoBase collections.
2.  **SimplyPlural**: An external API for managing "Headmates" (plural system members).

**Core Goals:**
*   **Universal View Framework**: Data from NocoBase can be viewed as Tables, Kanbans, Calendars, or Galleries. Views are highly configurable and settings are persisted.
*   **System Integration**: Headmates are first-class citizens. The app tracks who is "fronting" and tags new/edited records with their ID automatically.
*   **Visual Aesthetics**: The design enforces a strict lowercase typography, dark/glassmorphism UI, and high responsiveness.
*   **Mobile-First**: The navigation and layout adapt aggressively for mobile usage (bottom nav) vs desktop (sidebar).

**Key Technical Details:**
*   **Routing**: Custom logic in `root-layout.tsx` (Databases, Home, Headmates).
*   **State**: `useAuth` (JWT) and `useFronter` (SimplyPlural context).
*   **Widgets**: The Home Page uses an XY coordinate system for an infinite canvas of "Database Widgets".
*   **Components**: Shadcn/UI is used extensively.
*   **Conventions**: All user-facing text should be lowercase.

**Current Status:**
*   Responsive optimizations are ongoing.
*   Headmate context menu and auto-metadata injection are active.
*   Calendar Year/Week/Day views are implemented.
