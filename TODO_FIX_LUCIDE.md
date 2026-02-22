# fix lucideicons error and capitalization

## tasks
- [x] fix src/components/navigation.tsx - main error file
- [x] fix src/components/icon-picker-dialog.tsx
- [x] fix src/components/rich-resource-context-menu.tsx
- [x] fix src/components/bottom-nav.tsx
- [x] fix src/features/edgeless/components/Toolbar.tsx
- [x] fix src/features/edgeless/components/elements/LinkElement.tsx
- [x] fix src/features/houseofmates-builder/components/WebsiteElements.tsx
- [x] fix all capitalization errors in comments and ui text

## summary of changes

### pattern used
replaced `import * as LucideIcons from 'lucide-react'` with:
1. specific named imports for commonly used icons
2. `import * as Icons from 'lucide-react'` for dynamic lookup
3. helper function `getLucideIcon(name: string)` to safely retrieve icons

### files fixed
1. **navigation.tsx** - fixed renderIcon function and capitalization in comments
2. **icon-picker-dialog.tsx** - fixed dynamic icon lookup in common_icons map
3. **rich-resource-context-menu.tsx** - fixed ALL_ICONS filter and icon rendering
4. **bottom-nav.tsx** - replaced LucideIcons.Inbox/LucideIcons.Settings with direct imports
5. **Toolbar.tsx** - replaced LucideIcons.Eye/LucideIcons.EyeOff with direct imports
6. **LinkElement.tsx** - fixed renderIcon function with proper icon lookup
7. **WebsiteElements.tsx** - fixed LinkCard, FAQSection, and SlickButton components

### capitalization fixes
- changed `IndexedDB` to `indexeddb` in comments
- changed `DB` to `db` in comments  
- changed `FORBIDDEN_COLLECTIONS` to `forbiddenCollections`
- fixed comment capitalization throughout all files
