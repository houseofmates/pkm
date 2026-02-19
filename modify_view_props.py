import sys

# 1. Update Registry
registry_path = 'src/components/views/registry.tsx'
with open(registry_path, 'r') as f:
    registry_content = f.read()

if "onCreate?: (data: any) => Promise<void> | void;" not in registry_content:
    registry_content = registry_content.replace(
        "onCreateRecord?: () => void;",
        "onCreateRecord?: () => void;\n  onCreate?: (data: any) => Promise<void> | void;"
    )
    with open(registry_path, 'w') as f:
        f.write(registry_content)
    print("Updated registry.tsx")
else:
    print("registry.tsx already updated")

# 2. Update JournalView
journal_path = 'src/components/views/journal-view.tsx'
with open(journal_path, 'r') as f:
    journal_content = f.read()

if "onCreate" not in journal_content:
    # Update function signature
    journal_content = journal_content.replace(
        "onEdit: _onEdit }: ViewProps) {",
        "onEdit: _onEdit, onCreate }: ViewProps) {"
    )

    # Update submit logic
    submit_block_search = """  // hack: dispatch an event that the app knows how to handle?
  // or modify viewprops in registry to include ? that's cleaner.
  // i will modify registry next.

  // temporary dispatch for now to show intent
  const newRecord = {
  [contentField.name]: ,
  status: 'published', // default
  };

  // we will assume onupdaterecord with id='new' might be treated as create? no.
  // i'll emit a custom event "pkm:create-record"
  window.dispatchEvent(new CustomEvent('pkm:create-record', {
  detail: {
 collection: collection.name,
 data: newRecord
  }
  }));

  setEntry('');
  toast.success("entry captured!");"""

    # Note: trying to match exact multiline string might be fragile.
    # I'll use a simpler replacement if possible or use regex in python.
    pass

# Simplified JournalView replacement using simpler string matching
if "window.dispatchEvent(new CustomEvent('pkm:create-record'" in journal_content:
    # We replace the whole handleSubmit body or the specific part
    # Let's replace the dispatch block
    start_marker = "const newRecord = {"
    end_marker = 'toast.success("entry captured!");'

    start_idx = journal_content.find(start_marker)
    end_idx = journal_content.find(end_marker)

    if start_idx != -1 and end_idx != -1:
        # Construct new block
        new_block = """const newRecord = {
    [contentField.name]: ,
    status: 'published', // default
  };

  if (onCreate) {
    await onCreate(newRecord);
    setEntry('');
    toast.success("entry captured!");
  } else {
    // Fallback or warning
    console.warn("JournalView: onCreate prop missing");
    toast.error("Could not save entry: implementation missing");
  }"""

        # We need to replace from start_marker to end_marker + length
        # But wait, original code has lines between.
        # Let's verify the content structure.
        pass

# 3. Update DatabaseWidget
widget_path = 'src/features/databases/components/database-widget.tsx'
with open(widget_path, 'r') as f:
    widget_content = f.read()

if "createRecord" not in widget_content:
    widget_content = widget_content.replace(
        "const { records, loading, refresh } = useRecords",
        "const { records, loading, refresh, createRecord } = useRecords"
    )
    widget_content = widget_content.replace(
        "onConfigChange={(newConf: any) => onConfigChange?.({ ...viewConfig, ...newConf })}",
        "onConfigChange={(newConf: any) => onConfigChange?.({ ...viewConfig, ...newConf })}\n        onCreate={createRecord}"
    )
    with open(widget_path, 'w') as f:
        f.write(widget_content)
    print("Updated database-widget.tsx")

# 4. Update CollectionDetailPage
detail_path = 'src/pages/collection-detail.tsx'
with open(detail_path, 'r') as f:
    detail_content = f.read()

if "onCreate={createRecord}" not in detail_content:
    # Need to ensure createRecord is destructured.
    # Current code: const { records, loading, refresh, updateRecord, deleteRecord } = useRecords...
    # Wait, I don't know if createRecord is destructured. I should check or add it.

    if "createRecord" not in detail_content:
         detail_content = detail_content.replace(
             "} = useRecords(collection.name",
             ", createRecord } = useRecords(collection.name"
         )
         # Fallback for collectionName usage if slightly different
         detail_content = detail_content.replace(
             "} = useRecords(collectionName",
             ", createRecord } = useRecords(collectionName"
         )

    detail_content = detail_content.replace(
        "onCreateRecord={handleDirectCreate}",
        "onCreateRecord={handleDirectCreate}\n                    onCreate={createRecord}"
    )
    with open(detail_path, 'w') as f:
        f.write(detail_content)
    print("Updated collection-detail.tsx")
