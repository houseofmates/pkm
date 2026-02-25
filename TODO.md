# todo: if/then color rules button + right-click field editing + image editor enhancements

## part 1: value color rules dialog
- [ ] create `src/features/records/components/value-color-rules-dialog.tsx` — dedicated dialog for managing if/then color rules
  - field-type-aware: select options for select fields, text/number matching for others
- [ ] update `src/features/records/components/property-context-menu.tsx` — remove inline rules section, add button to open dialog

## part 2: right-click editing for specific field types
- [ ] update `src/components/fields/smart-field.tsx` — url fields: right-click = edit url, left-click = open link
- [ ] update `src/components/fields/smart-field.tsx` — attachment fields: ensure right-click opens editor consistently

## part 3: enhanced image editor
- [ ] update `src/components/fields/smart-field.tsx` — add color grading (shadow/midtone/highlight tint sliders)
- [ ] update `src/components/fields/smart-field.tsx` — add highlight/marker tool (semi-transparent brush)
- [ ] update `src/components/fields/smart-field.tsx` — improve crop ui with aspect ratio presets

## followup
- [ ] verify all changes work together
- [ ] test value color rules dialog with select and text fields
- [ ] test right-click on url fields
- [ ] test image editor enhancements
