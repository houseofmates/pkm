import { useState } from 'react';
import { useCollections, type Collection } from '@/hooks/use-collections';
import { DataEmbed } from '@/components/DataEmbed/DataEmbed';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from 'lucide-react';
import { useEdgelessStore } from '@/features/edgeless/store';

interface DatabaseViewWidgetProps {
  data: any;
}

export function DatabaseViewWidget({ data }: DatabaseViewWidgetProps) {
  const { collections } = useCollections();
  const [localCollection, setLocalCollection] = useState<string>(data.collection || '');
  const viewType = data.view || 'gallery';
  const limit = data.limit || 10;

  const handleSelect = (name: string) => {
    setLocalCollection(name);
    // persist into element data so it survives reload
    if (data._elementId) {
      useEdgelessStore.getState().updateElement(data._elementId, {
        data: { ...data, collection: name },
      });
    }
  };

  if (!localCollection) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-card/10 backdrop-blur-md border border-white/5 rounded-xl p-4">
        <Database className="h-8 w-8 text-primary/40" />
        <span className="text-xs text-muted-foreground lowercase">select a collection</span>
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="w-[200px] border-border/50 bg-background/50 backdrop-blur text-sm">
            <SelectValue placeholder="choose collection..." />
          </SelectTrigger>
          <SelectContent>
            {collections.map((col: Collection) => (
              <SelectItem key={col.name} value={col.name}>
                {col.title || col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-card/10 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="h-8 bg-black/20 border-b border-white/5 flex items-center px-3 justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/50" />
          <span className="text-[10px] font-bold tracking-widest opacity-50 lowercase">
            {localCollection}
          </span>
        </div>
        <span className="text-[9px] opacity-30 font-mono lowercase">live</span>
      </div>
      <div className="flex-1 relative overflow-hidden bg-background/5">
        <DataEmbed
          collection={localCollection}
          view={viewType}
          limit={limit}
          height="100%"
          className="rounded-none border-none bg-transparent"
        />
      </div>
    </div>
  );
}
