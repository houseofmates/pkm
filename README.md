# PKM Frontend - React + NocoBase + SimplyPlural

**For the User:**
This is your personal Knowledge Management System, integrated with your Headmate system (SimplyPlural) and a flexible database backend (NocoBase). It is designed to be a unified, beautiful, and "lowercase-mode" interface for managing your life, system, and data on both mobile and desktop. It features an infinite canvas home page, detailed database views (Calendar, Kanban, Table, Gallery), and comprehensive personalization options.

---

**Context for LLMs:**
### Core Purpose & Identity
This project is a **Personal Knowledge Management (PKM)** system built specifically for the user, who is a **depressed autistic DID (Dissociative Identity Disorder) system with ADHD**. 
- The app must feel safe, low-friction, and visually calming.
- It acts as a custom frontend for **NocoBase** and **SimplyPlural**.

### Strict Typography Rule: All Lowercase
- **Mandatory**: All user-facing UI text (buttons, labels, headers, placeholders, etc.) MUST be lowercase.
- **Exceptions**: Data values stored within database fields (e.g., a record title entered by the user) should be displayed as-is, but all UI chrome and fixed labels must be lowercase.
- **Correction Policy**: If any hardcoded text or visible UI label is found with capitalization, it is considered a bug and must be changed to lowercase immediately.

### Technical Stack
- **Framework**: React, Vite, TypeScript, Tailwind CSS.
- **APIs**: NocoBase (Collections), SimplyPlural (Headmates).
- **UI Components**: Shadcn/UI (Radix UI).

### Key Technical Details
*   **Routing**: Custom logic in `root-layout.tsx`.
*   **State**: `useAuth` (JWT) and `useFronter` (SimplyPlural context).
*   **Widgets**: The home page uses an XY coordinate system for an infinite canvas of "database widgets".
*   **Mobile-First**: Navigation adapts for mobile (bottom nav) vs desktop (sidebar).

**Current Status:**
*   Responsive optimizations are ongoing.
*   Headmate context menu and auto-metadata injection are active.
*   Calendar Year/Week/Day views are implemented.
*   Chart views use a single gear button for configuration to maintain a clean interface.
