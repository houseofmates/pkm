import { useState } from 'react';
import { WIDGET_REGISTRY } from './registry';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface UniversalWidgetPickerProps {
  filter?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (widgetType: string, defaultData: any) => void;
}

export function UniversalWidgetPicker({ open, onOpenChange, onSelect, filter }: UniversalWidgetPickerProps) {
  const [search, setSearch] = useState('');

  const widgets = Object.values(WIDGET_REGISTRY).filter(w =>
    (w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())) &&
    (!filter || w.id.includes(filter) || w.label.toLowerCase().includes(filter) || (filter === 'database' && w.id === 'embed-nocobase'))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="lowercase text-primary">add widget</DialogTitle>
        </DialogHeader>

        <div className="flex items-center px-3 py-2 border rounded-lg bg-black/20 mb-4">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <Input
            placeholder="search widgets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border-none shadow-none h-8 bg-transparent focus-visible:ring-0"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
          {widgets.map(widget => (
            <button
              key={widget.id}
              onClick={() => {
                onSelect(widget.id, widget.defaultData);
                onOpenChange(false);
              }}
              className="flex flex-col items-start p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all group text-left"
            >
              <div className="p-2 rounded-lg bg-black/40 text-primary mb-2 group-hover:scale-110 transition-transform">
                <widget.icon size={20} />
              </div>
              <div className="font-bold text-sm lowercase">{widget.label}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{widget.description}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
