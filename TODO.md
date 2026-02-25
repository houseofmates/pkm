# todo: add link database and link item field types

## steps:
- [ ] add field type definitions in `src/services/field-types.ts`
  - [ ] add `linkDatabase` field type
  - [ ] add `linkItem` field type
  - [ ] register both field types
- [ ] update `src/components/fields/smart-field.tsx`
  - [ ] add detection for new field types
  - [ ] create `LinkDatabasePicker` component
  - [ ] create `LinkItemPicker` component
  - [ ] add view mode render (clickable links)
  - [ ] add edit mode render (pickers)
