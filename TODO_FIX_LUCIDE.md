# fix lucideicons error and capitalization

## tasks
- [x] fix src/components/navigation.tsx - main error file
- [ ] fix src/components/icon-picker-dialog.tsx
- [ ] fix src/components/rich-resource-context-menu.tsx
- [ ] fix src/components/bottom-nav.tsx
- [ ] fix src/features/edgeless/components/Toolbar.tsx
- [ ] fix src/features/edgeless/components/elements/LinkElement.tsx
- [ ] fix src/features/houseofmates-builder/components/WebsiteElements.tsx
- [ ] fix all capitalization errors in comments and ui text

## approach
1. replace `import * as LucideIcons from 'lucide-react'` with specific imports
2. create a helper function `getLucideIcon(name: string)` for dynamic lookup
3. ensure all comments and ui text are lowercase
