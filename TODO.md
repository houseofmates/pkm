# todo: add link database and link item field types

## steps:
- [x] add field type definitions in `src/services/field-types.ts`
  - [x] add `linkDatabase` field type
  - [x] add `linkItem` field type
  - [x] register both field types
- [x] update `src/components/fields/smart-field.tsx`
  - [x] add detection for new field types
  - [x] create `LinkDatabasePicker` component
  - [x] create `LinkItemPicker` component
  - [x] add view mode render (clickable links)
  - [x] add edit mode render (pickers)

## implementation complete!

### new field types added:

1. **linkDatabase** - references another database/collection
   - stores: `{ id: string, name: string }`
   - view: clickable indigo badge that navigates to `/databases/${id}`
   - edit: scrollable searchable list of all collections from pkm store

2. **linkItem** - references any item (record, canvas, or document)
   - stores: `{ id: string|number, collection: string, title: string, type: 'record'|'canvas'|'document' }`
   - view: clickable emerald badge with type icon
     - records → `/databases/${collection}/${id}`
     - canvases → `/canvas/${id}`
     - documents → `/page/${id}`
   - edit: searchable picker with type filters (all/record/canvas/document)
     - searches across collections, localStorage canvases, and documents
