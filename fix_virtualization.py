import re

file_path = 'src/features/records/components/record-table.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Fix Import
content = content.replace("import { List } from 'react-window';", "import { FixedSizeList as List } from 'react-window';")

# Fix List Usage
# Look for <List ... rowComponent={DraggableRecordRow} /> block and replace props
pattern = r'<List\s+rowCount={rows\.length}\s+rowHeight={40}\s+rowProps={{\s+rows: rows,\s+collection,\s+onUpdate: onUpdateRecord,\s+onDelete,\s+onCreateField,\s+onCreateRecord,\s+recordMeta\s+}}\s+style={{ height, width }}\s+rowComponent={DraggableRecordRow}\s+/>'

replacement = r'''<List
                          height={height}
                          width={width}
                          itemCount={rows.length}
                          itemSize={40}
                          itemData={{
                            rows: rows,
                            collection,
                            onUpdate: onUpdateRecord,
                            onDelete,
                            onCreateField,
                            onCreateRecord,
                            recordMeta
                          }}
                        >
                          {DraggableRecordRow}
                        </List>'''

# Using regex to match whitespace flexibly
regex = re.compile(r'<List\s+rowCount=\{rows\.length\}\s+rowHeight=\{40\}\s+rowProps=\{\{\s+rows: rows,\s+collection,\s+onUpdate: onUpdateRecord,\s+onDelete,\s+onCreateField,\s+onCreateRecord,\s+recordMeta\s+\}\}\s+style=\{\{ height, width \}\}\s+rowComponent=\{DraggableRecordRow\}\s+/>', re.DOTALL)

if regex.search(content):
    content = regex.sub(replacement, content)
else:
    print("Could not find List component usage to replace.")
    # Fallback: try simpler replacement if whitespace is tricky
    # Or just print warning

with open(file_path, 'w') as f:
    f.write(content)

print("Updated file.")
