# task implementation tracking

## changes to implement

### 1. implement global search trigger in navigation.tsx
- [x] import `GlobalSearchDialog` component
- [x] add state for `searchOpen` and `setSearchOpen`
- [x] replace custom event dispatch with direct dialog trigger
- [x] render `<GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />`

### 2. refine drag-and-drop interaction in moodboard.tsx
- [x] replace `e.stopPropagation()` hack with robust state machine
- [x] use explicit `canvasMode` state ('viewing' | 'editing') to control drag behavior
- [x] only allow dragging when in 'viewing' mode
- [x] separate concerns: editing mode vs viewing/moving mode

### 3. standardize record creation in journal-view.tsx
- [x] verify `onCreate` prop is used consistently - already implemented correctly
- [x] check for `pkm:create-record` event dispatch - not present in file
- [x] ensure proper typing with ViewProps interface - `onCreate?: (data: any) => Promise<void> | void` is defined

**note:** the journal-view.tsx already properly uses the `onCreate` prop from ViewProps interface. the component:
- accepts `onCreate` from ViewProps
- checks `if (!onCreate)` before calling
- uses `await onCreate(newRecord)` for creation
- button is disabled when `!onCreate`

no `pkm:create-record` event is used in this file. the standardization is already complete.
