import re

file_path = 'src/components/editor/extensions/WidgetBlock.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Replace return block to include onUpdateWidget
pattern = r'<WidgetRenderer widget=\{widgetConfig\} data=\{\{\}\} />'
replacement = r'<WidgetRenderer widget={widgetConfig} data={{}} onUpdateWidget={(patch: any) => props.updateAttributes({ data: { ...data, ...patch.data, ...patch } })} />'

if re.search(r'<WidgetRenderer', content):
    content = content.replace('<WidgetRenderer widget={widgetConfig} data={{}} />', replacement)
    print("Updated WidgetBlock.tsx")
else:
    print("Could not find WidgetRenderer usage in WidgetBlock.tsx")

with open(file_path, 'w') as f:
    f.write(content)
