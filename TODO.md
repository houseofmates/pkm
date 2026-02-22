# task implementation tracking

## changes to implement

### 1. implement global search trigger in navigation.tsx
- [ ] import `GlobalSearchDialog` component
- [ ] add state for `searchOpen` and `setSearchOpen`
- [ ] replace custom event dispatch with direct dialog trigger
- [ ] render `<GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />`

### 2. refine drag-and-drop interaction in moodboard.tsx
- [ ] replace `e.stopPropagation()` hack with robust state machine
- [ ] use explicit `isEditing` state to control drag behavior
- [ ] only allow dragging when not in editing mode
- [ ] separate concerns: editing mode vs viewing/moving mode

### 3. standardize record creation in journal-view.tsx
- [ ] verify `onCreate` prop is used consistently
- [ ] remove any fallback `pkm:create-record` event dispatch
- [ ] ensure proper typing with ViewProps interface

