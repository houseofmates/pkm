import re

file_path = 'src/components/editor/slash-command.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Add 4 Columns
if '4 Columns' not in content:
    content = content.replace(
        "title: '3 Columns',",
        "title: '3 Columns',\n  },\n  {\n  title: '4 Columns',\n  description: 'Create four equal columns.',\n  command: ({ editor, range }: any) => {\n editor.chain().focus().deleteRange(range).setColumns(4).run();\n  },"
    )

# Add Database View shortcut
if 'Database View' not in content:
    content = content.replace(
        "title: 'Insert Widget',",
        "title: 'Database View',\n  description: 'Embed a view from any database.',\n  command: ({ editor, range }: any) => {\n editor.chain().focus().deleteRange(range).run();\n window.dispatchEvent(new CustomEvent('pkm:open-widget-picker', { detail: { filter: 'database', onSelect: (type: string, data: any) => { editor.chain().focus().insertContent({ type: 'widgetBlock', attrs: { type, data } }).run(); } } }));\n  },\n  },\n  {\n  title: 'Insert Widget',"
    )

with open(file_path, 'w') as f:
    f.write(content)

print("Updated slash-command.ts")
