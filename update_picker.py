import re

file_path = 'src/features/widgets/UniversalWidgetPicker.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Update props interface
content = content.replace(
    "interface UniversalWidgetPickerProps {",
    "interface UniversalWidgetPickerProps {\n  filter?: string;"
)

# Update component signature
content = content.replace(
    "export function UniversalWidgetPicker({ open, onOpenChange, onSelect }: UniversalWidgetPickerProps) {",
    "export function UniversalWidgetPicker({ open, onOpenChange, onSelect, filter }: UniversalWidgetPickerProps) {"
)

# Update filter logic
filter_logic = """
  const widgets = Object.values(WIDGET_REGISTRY).filter(w =>
    (w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())) &&
    (!filter || w.id.includes(filter) || w.label.toLowerCase().includes(filter) || (filter === 'database' && w.id === 'embed-nocobase'))
  );
"""

regex = re.compile(r'const widgets = Object\.values\(WIDGET_REGISTRY\)\.filter\(w =>.*? \);', re.DOTALL)
if regex.search(content):
    content = regex.sub(filter_logic.strip(), content)
else:
    print("Could not replace widget filter logic")

with open(file_path, 'w') as f:
    f.write(content)

print("Updated UniversalWidgetPicker.tsx")
