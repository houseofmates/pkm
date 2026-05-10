# Planned Features & Improvements

## 1. Formulas (Calculated Fields)
- **Goal**: Allow users to define calculated columns in NocoBase tables.
- **Implementation**:
  - Use `mathjs` or `formula-parser` library.
  - Create a new field type 'formula' in NocoBase schema.
  - Add UI editor in `src/components/fields/formula-editor.tsx`.
  - Backend validation/calculation on save (via hooks) or client-side calculation for display.
  - Priority: Medium.

## 2. Kanban View
- **Goal**: Fully functional Kanban board for status/grouping fields.
- **Status**: Partially implemented in `src/components/views/kanban-view.tsx`.
- **Tasks**:
  - Fix drag-and-drop to update record status via API.
  - Allow user to configure `groupByField` in UI (View Settings).
  - Add creating new columns (new option values) from the board.
  - Improve UI for empty states.
  - Priority: High.

## 3. Custom Views
- **Goal**: Allow plugins/extensions to add new view types.
- **Implementation**:
  - Refactor `VIEW_REGISTRY` to be extensible at runtime (e.g. `registerView(type, component)`).
  - Create a plugin system where `src/plugins` can export views.
  - Example: Calendar, Gantt, Map views (already present but need refinement).
  - Priority: Low.

## 4. Search Improvements
- **Goal**: Unified semantic search across all content.
- **Status**: Backend `/search` endpoint exists (lancedb + ollama). Frontend uses `Spotlight`.
- **Tasks**:
  - Ensure all record types (Headmates, Captures, Pages) are indexed.
  - Add indexing triggers on record update/create (via webhooks or backend hooks).
  - Add UI for filtering search results by collection type.
  - Priority: High.

## 5. Optimization
- **Goal**: Handle >10k records smoothly.
- **Status**: Virtualization added to `RecordTable`.
- **Tasks**:
  - Verify `react-window` implementation with large dataset.
  - Implement virtualization for `Grid` / `Gallery` views.
  - Implement server-side pagination/cursor for infinite scrolling instead of loading all 10k records at once (currently `useCollections` likely loads all?).
  - Priority: Critical.
