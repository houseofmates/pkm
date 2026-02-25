import re

file_path = 'src/components/widgets/WidgetRenderer.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Add imports
imports = """
import { useCollections } from '@/hooks/use-collections';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
"""
if "useCollections" not in content:
    content = imports + content

# Logic for embed_nocobase
pattern = r"if \(type === 'embed_nocobase' \|\| type === 'database'\) \{[\s\S]*?return \([\s\S]*?\);\s+\}"

replacement = """
    if (type === 'embed_nocobase' || type === 'database') {
        const { collections } = useCollections();
        const collectionName = widget.data?.collection || widget.collection;

        if (!collectionName) {
            return (
                <div className="p-6 border border-dashed rounded-xl bg-muted/20 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                    <div className="text-sm font-medium text-muted-foreground">Select a database to view</div>
                    <div className="w-full max-w-xs">
                        <Select onValueChange={(val) => onUpdateWidget?.({ data: { ...widget.data, collection: val } })}>
                            <SelectTrigger>
                                <SelectValue placeholder="choose database..." />
                            </SelectTrigger>
                            <SelectContent>
                                {collections.map((c: any) => (
                                    <SelectItem key={c.name} value={c.name}>
                                        {c.title || c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-2 h-[400px]">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm lowercase">{widget.title || collectionName}</h4>
                    <div className="flex gap-2">
                         {/* View Switcher Placeholder */}
                         <Select
                           value={widget.data?.view || 'gallery'}
                           onValueChange={(val) => onUpdateWidget?.({ data: { ...widget.data, view: val } })}
                         >
                            <SelectTrigger className="h-6 text-xs w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="table">table</SelectItem>
                                <SelectItem value="gallery">gallery</SelectItem>
                                <SelectItem value="kanban">kanban</SelectItem>
                                <SelectItem value="calendar">calendar</SelectItem>
                            </SelectContent>
                         </Select>
                    </div>
                </div>
                <DataEmbed
                    collection={collectionName}
                    view={widget.data?.view || 'table'}
                    limit={widget.data?.limit || 10}
                    height="100%"
                />
            </div>
        );
    }
"""

regex = re.compile(pattern)
if regex.search(content):
    content = regex.sub(replacement, content)
    print("Updated WidgetRenderer logic")
else:
    print("Could not find embed_nocobase block")

with open(file_path, 'w') as f:
    f.write(content)
